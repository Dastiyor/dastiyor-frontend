/** @jest-environment node */
import { POST } from '../login/code/route';
import { POST as passwordLogin } from '../login/route';
import { prismaMock } from '../../../../__tests__/mocks/prisma';
import { consumeOtp } from '@/lib/otp';
import { logAction } from '@/lib/audit';

jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: jest.fn(() => ({ allowed: true })),
    getClientIP: jest.fn(() => '127.0.0.1'),
    rateLimitExceededResponse: jest.fn(),
}));
jest.mock('@/lib/auth', () => ({ signJWT: jest.fn().mockResolvedValue('mock-jwt-token'), SESSION_MAX_AGE: 100 }));
jest.mock('@/lib/audit', () => ({ logAction: jest.fn(), getRequestIP: jest.fn() }));
jest.mock('@/lib/persist-locale', () => ({ persistRequestLocale: jest.fn().mockResolvedValue('ru') }));
jest.mock('@/lib/otp', () => ({ consumeOtp: jest.fn() }));

const PHONE = '+992901234567';
const user = { id: 'u1', email: 'a@b.tj', fullName: 'A', role: 'PROVIDER', tokenVersion: 2, password: null };
const request = (body: unknown) =>
    new Request('http://localhost/api/auth/login/code', { method: 'POST', body: JSON.stringify(body) });

describe('/api/auth/login/code', () => {
    beforeEach(() => jest.clearAllMocks());

    it('signs in a verified number with the right code', async () => {
        prismaMock.user.findFirst.mockResolvedValue(user as any);
        (consumeOtp as jest.Mock).mockResolvedValue(true);

        const res = await POST(request({ phone: '90 123 4567', code: '123456' }));

        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ token: 'mock-jwt-token', user: { id: 'u1', role: 'PROVIDER' } });
        expect(res.headers.get('set-cookie')).toContain('token=mock-jwt-token');
        expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
            where: { phone: PHONE, phoneVerified: true },
            orderBy: { createdAt: 'asc' },
        });
        expect(consumeOtp).toHaveBeenCalledWith(PHONE, '123456', 'LOGIN');
    });

    it('refuses a wrong code', async () => {
        prismaMock.user.findFirst.mockResolvedValue(user as any);
        (consumeOtp as jest.Mock).mockResolvedValue(false);

        const res = await POST(request({ phone: PHONE, code: '000000' }));

        expect(res.status).toBe(400);
        expect(res.headers.get('set-cookie')).toBeNull();
    });

    it('says when the number has no account, without spending a code', async () => {
        prismaMock.user.findFirst.mockResolvedValue(null);
        prismaMock.user.findMany.mockResolvedValue([]);

        const res = await POST(request({ phone: PHONE, code: '123456' }));

        expect(res.status).toBe(401);
        expect((await res.json()).code).toBe('ACCOUNT_NOT_FOUND');
        expect(consumeOtp).not.toHaveBeenCalled();
    });

    const unverified = (...accounts: unknown[]) => {
        prismaMock.user.findFirst.mockResolvedValue(null);
        prismaMock.user.findMany.mockResolvedValue(accounts as any);
    };

    it('signs in the only account on a number and verifies it', async () => {
        unverified(user);
        prismaMock.user.update.mockResolvedValue({ ...user, phoneVerified: true } as any);
        (consumeOtp as jest.Mock).mockResolvedValue(true);

        const res = await POST(request({ phone: PHONE, code: '123456' }));

        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ user: { id: 'u1' } });
        expect(prismaMock.user.findMany).toHaveBeenCalledWith({ where: { phone: PHONE }, take: 2 });
        expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { phoneVerified: true } });
        expect(logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'PHONE_VERIFIED_BY_LOGIN', userId: 'u1' }));
    });

    it('verifies nothing on a wrong code', async () => {
        unverified(user);
        (consumeOtp as jest.Mock).mockResolvedValue(false);

        const res = await POST(request({ phone: PHONE, code: '000000' }));

        expect(res.status).toBe(400);
        expect(prismaMock.user.update).not.toHaveBeenCalled();
        expect(logAction).not.toHaveBeenCalled();
    });

    it.each([
        ['several unverified accounts share the number', [user, { ...user, id: 'u2' }]],
        ['the only account is an admin', [{ ...user, role: 'ADMIN' }]],
    ])('refuses when %s, without spending a code', async (_name, accounts) => {
        unverified(...accounts);

        const res = await POST(request({ phone: PHONE, code: '123456' }));

        expect(res.status).toBe(401);
        expect((await res.json()).code).toBe('PASSWORD_REQUIRED');
        expect(consumeOtp).not.toHaveBeenCalled();
    });

    it('requires both fields and a real number', async () => {
        expect((await POST(request({ phone: PHONE }))).status).toBe(400);
        expect((await POST(request({ phone: '12', code: '123456' }))).status).toBe(400);
    });

    it('password login points a password-less phone account to the code', async () => {
        prismaMock.user.findFirst.mockResolvedValue(user as any);

        const res = await passwordLogin(request({ identifier: PHONE, password: 'whatever1' }));

        expect(res.status).toBe(401);
        expect((await res.json()).code).toBe('PASSWORD_NOT_SET');
    });
});
