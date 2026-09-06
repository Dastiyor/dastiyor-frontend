import { NextRequest } from 'next/server';
import { POST } from '../route';
import { POST as RESET } from '../../../reset-password/mobile/route';
import { prismaMock } from '../../../../../../__tests__/mocks/prisma';
import { sendVerificationCode } from '@/lib/notifications/sms';
import { sendPasswordResetCodeEmail } from '@/lib/notifications/email';

jest.mock('@/lib/notifications/sms', () => ({ sendVerificationCode: jest.fn() }));
jest.mock('@/lib/notifications/email', () => ({ sendPasswordResetCodeEmail: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: jest.fn(async () => ({ allowed: true, resetIn: 0 })),
    getClientIP: jest.fn(() => '1.2.3.4'),
    rateLimitExceededResponse: jest.fn(),
}));
jest.mock('@/lib/audit', () => ({ logAction: jest.fn(), getRequestIP: jest.fn(() => '1.2.3.4') }));
jest.mock('bcryptjs', () => ({ hash: jest.fn(async () => 'new-hash') }));

const PHONE = '+992905550101';

function req(url: string, body: unknown) {
    return new NextRequest(url, { method: 'POST', body: JSON.stringify(body) });
}
const forgot = (body: unknown) => req('http://localhost/api/auth/forgot-password/mobile', body);
const reset = (body: unknown) => req('http://localhost/api/auth/reset-password/mobile', body);

describe('phone account recovery', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
        (sendVerificationCode as jest.Mock).mockResolvedValue(true);
        (prismaMock.verificationCode.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
        (prismaMock.verificationCode.create as jest.Mock).mockResolvedValue({});
    });

    it('texts a code when the identifier is a phone number', async () => {
        (prismaMock.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-1' });

        const response = await POST(forgot({ identifier: PHONE }));

        expect(response.status).toBe(200);
        expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { phone: PHONE } })
        );
        expect(sendVerificationCode).toHaveBeenCalledWith(PHONE, expect.stringMatching(/^\d{6}$/));
        expect((prismaMock.verificationCode.create as jest.Mock).mock.calls[0][0].data.type)
            .toBe('RESET_PASSWORD');
    });

    it('texts a code when the identifier is the placeholder address of a phone-only account', async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'phone_992905550101@phone.dastiyor.local',
            phone: PHONE,
        });

        const response = await POST(forgot({ identifier: 'phone_992905550101@phone.dastiyor.local' }));

        expect(response.status).toBe(200);
        expect(sendVerificationCode).toHaveBeenCalledWith(PHONE, expect.any(String));
        // Never mail a code into a domain that cannot receive it
        expect(sendPasswordResetCodeEmail).not.toHaveBeenCalled();
    });

    it('says the same thing for an unknown phone, and sends nothing', async () => {
        (prismaMock.user.findFirst as jest.Mock).mockResolvedValue(null);

        const response = await POST(forgot({ identifier: PHONE }));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toContain('If an account exists');
        expect(sendVerificationCode).not.toHaveBeenCalled();
    });

    it('still emails a code for an account with a real address', async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-1', email: 'user@example.com', phone: null, locale: 'ru',
        });
        (prismaMock.passwordReset.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
        (prismaMock.passwordReset.create as jest.Mock).mockResolvedValue({});

        await POST(forgot({ identifier: 'user@example.com' }));

        expect(sendPasswordResetCodeEmail).toHaveBeenCalled();
        expect(sendVerificationCode).not.toHaveBeenCalled();
    });

    it('resets the password against the SMS code and revokes existing sessions', async () => {
        (prismaMock.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-1', phone: PHONE });
        (prismaMock.verificationCode.findFirst as jest.Mock).mockResolvedValue({ id: 'code-1' });
        (prismaMock.verificationCode.update as jest.Mock).mockResolvedValue({});
        (prismaMock.verificationCode.delete as jest.Mock).mockResolvedValue({});
        (prismaMock.$transaction as unknown as jest.Mock).mockResolvedValue([]);

        const response = await POST_reset({ identifier: PHONE, code: '123456', password: 'Dastiyor2026' });

        expect(response.status).toBe(200);
        // The code is burned, not just read
        expect(prismaMock.verificationCode.update).toHaveBeenCalledWith({
            where: { id: 'code-1' }, data: { used: true },
        });
        expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
        }));
    });

    it('rejects a wrong SMS code without touching the password', async () => {
        (prismaMock.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-1', phone: PHONE });
        (prismaMock.verificationCode.findFirst as jest.Mock).mockResolvedValue(null);

        const response = await POST_reset({ identifier: PHONE, code: '000000', password: 'Dastiyor2026' });

        expect(response.status).toBe(400);
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
});

function POST_reset(body: unknown) {
    return RESET(reset(body));
}
