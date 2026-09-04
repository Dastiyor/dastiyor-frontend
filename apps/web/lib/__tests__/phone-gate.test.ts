import { needsPhoneVerification } from '../phone-gate';

describe('needsPhoneVerification', () => {
    afterEach(() => {
        delete process.env.PHONE_VERIFICATION_ENABLED;
    });

    describe('with PHONE_VERIFICATION_ENABLED unset (the default)', () => {
        it('gates nobody, verified or not', () => {
            expect(needsPhoneVerification({ phoneVerified: false })).toBe(false);
            expect(needsPhoneVerification({ phoneVerified: true })).toBe(false);
        });
    });

    describe('with PHONE_VERIFICATION_ENABLED=true', () => {
        beforeEach(() => {
            process.env.PHONE_VERIFICATION_ENABLED = 'true';
        });

        it('gates a user who has not verified a phone', () => {
            expect(needsPhoneVerification({ phoneVerified: false })).toBe(true);
        });

        it('lets a verified user through', () => {
            expect(needsPhoneVerification({ phoneVerified: true })).toBe(false);
        });
    });

    it('treats any value other than the exact string "true" as off', () => {
        for (const value of ['false', '1', 'TRUE', 'yes', '']) {
            process.env.PHONE_VERIFICATION_ENABLED = value;
            expect(needsPhoneVerification({ phoneVerified: false })).toBe(false);
        }
    });
});
