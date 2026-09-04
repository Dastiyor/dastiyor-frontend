import { NextRequest } from 'next/server';
import { POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { sendVerificationCode } from '@/lib/notifications/sms';

jest.mock('@/lib/prisma');
jest.mock('@/lib/notifications/sms', () => ({
    sendVerificationCode: jest.fn(),
}));
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: jest.fn(async () => ({ allowed: true, resetIn: 0 })),
    getClientIP: jest.fn(() => '1.2.3.4'),
    rateLimitExceededResponse: jest.fn(),
}));

const TEST_PHONE = '+992900000001';
const TEST_CODE = '424242';

function req(body: unknown) {
    return new NextRequest('http://localhost/api/auth/verify-send', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

describe('/api/auth/verify-send', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.SMS_TEST_PHONE;
        delete process.env.SMS_TEST_CODE;
        (prismaMock.verificationCode.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
        (prismaMock.verificationCode.create as jest.Mock).mockResolvedValue({});
        (sendVerificationCode as jest.Mock).mockResolvedValue(true);
    });

    it('sends a random code by SMS for a normal number', async () => {
        const response = await POST(req({ phone: '+992900000009', type: 'PHONE_VERIFY' }));

        expect(response.status).toBe(200);
        expect(sendVerificationCode).toHaveBeenCalledTimes(1);

        const stored = (prismaMock.verificationCode.create as jest.Mock).mock.calls[0][0].data.code;
        expect(stored).toMatch(/^\d{6}$/);
    });

    it('surfaces a 500 when the SMS provider rejects the send', async () => {
        (sendVerificationCode as jest.Mock).mockResolvedValue(false);

        const response = await POST(req({ phone: '+992900000009', type: 'PHONE_VERIFY' }));

        expect(response.status).toBe(500);
    });

    describe('designated test number', () => {
        beforeEach(() => {
            process.env.SMS_TEST_PHONE = TEST_PHONE;
            process.env.SMS_TEST_CODE = TEST_CODE;
        });

        it('stores the fixed code and sends no SMS', async () => {
            const response = await POST(req({ phone: TEST_PHONE, type: 'PHONE_VERIFY' }));

            expect(response.status).toBe(200);
            expect(sendVerificationCode).not.toHaveBeenCalled();
            expect((prismaMock.verificationCode.create as jest.Mock).mock.calls[0][0].data.code).toBe(TEST_CODE);
        });

        it('does not affect any other number', async () => {
            const response = await POST(req({ phone: '+992900000009', type: 'PHONE_VERIFY' }));

            expect(response.status).toBe(200);
            expect(sendVerificationCode).toHaveBeenCalledTimes(1);
            expect((prismaMock.verificationCode.create as jest.Mock).mock.calls[0][0].data.code).not.toBe(TEST_CODE);
        });

        it('stays inert when only one of the two env vars is set', async () => {
            delete process.env.SMS_TEST_CODE;

            const response = await POST(req({ phone: TEST_PHONE, type: 'PHONE_VERIFY' }));

            expect(response.status).toBe(200);
            // Falls through to the real SMS path rather than a half-configured bypass.
            expect(sendVerificationCode).toHaveBeenCalledTimes(1);
            expect((prismaMock.verificationCode.create as jest.Mock).mock.calls[0][0].data.code).not.toBe(TEST_CODE);
        });
    });
});
