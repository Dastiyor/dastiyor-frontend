import { POST } from '../route';
import { NextRequest } from 'next/server';
import { oauthAccountExists, upsertOAuthUser } from '@/lib/oauth';

jest.mock('@/lib/oauth', () => ({
    upsertOAuthUser: jest.fn(),
    oauthAccountExists: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
    getClientIP: jest.fn(() => '127.0.0.1'),
}));

describe('POST /api/auth/google/mobile', () => {
    let mockFetch: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch = jest.fn();
        global.fetch = mockFetch;
    });

    it('should return 400 if accessToken is missing', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/google/mobile', {
            method: 'POST',
            body: JSON.stringify({ role: 'customer' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Требуется токен доступа');
    });

    it('should return 401 if Google userinfo request is not ok', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/google/mobile', {
            method: 'POST',
            body: JSON.stringify({ accessToken: 'bad-token' }),
        });

        mockFetch.mockResolvedValue({
            ok: false,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Недействительный токен Google');
    });

    it('should return 401 if Google profile is incomplete', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/google/mobile', {
            method: 'POST',
            body: JSON.stringify({ accessToken: 'good-token' }),
        });

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ sub: '', email: '' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Неполный профиль Google');
    });

    it('should login and return user details on successful token verification', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/google/mobile', {
            method: 'POST',
            body: JSON.stringify({ accessToken: 'valid-token', role: 'provider' }),
        });

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                sub: 'google-sub-999',
                email: 'mobileuser@gmail.com',
                name: 'Mobile User',
            }),
        });

        (upsertOAuthUser as jest.Mock).mockResolvedValue({
            user: { id: 'user-id-999', email: 'mobileuser@gmail.com', fullName: 'Mobile User', role: 'PROVIDER', googleId: 'google-sub-999', phoneVerified: false },
            token: 'mock-jwt-mobile-token',
            isNew: false,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.token).toBe('mock-jwt-mobile-token');
        expect(data.user).toEqual({
            id: 'user-id-999',
            email: 'mobileuser@gmail.com',
            fullName: 'Mobile User',
            role: 'PROVIDER',
            phoneVerificationRequired: true,
        });

        expect(upsertOAuthUser).toHaveBeenCalledWith({
            provider: 'google',
            providerId: 'google-sub-999',
            email: 'mobileuser@gmail.com',
            name: 'Mobile User',
            role: 'provider',
            ipAddress: '127.0.0.1',
        });
    });

    describe('deferRole (the app asks for the role after sign-in)', () => {
        const googleProfile = { sub: 'g-1', email: 'new@gmail.com', name: 'New Person' };
        const send = (body: object) => POST(new NextRequest('http://localhost:3000/api/auth/google/mobile', {
            method: 'POST',
            body: JSON.stringify({ accessToken: 'valid-token', ...body }),
        }));

        beforeEach(() => {
            mockFetch.mockResolvedValue({ ok: true, json: async () => googleProfile });
            (upsertOAuthUser as jest.Mock).mockResolvedValue({
                user: { id: 'u1', email: 'new@gmail.com', fullName: 'New Person', role: 'CUSTOMER', phoneVerified: false },
                token: 'jwt',
                isNew: false,
            });
        });

        it('answers roleRequired for a new account and creates nothing', async () => {
            (oauthAccountExists as jest.Mock).mockResolvedValue(false);

            const res = await send({ deferRole: true });

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({ roleRequired: true });
            expect(oauthAccountExists).toHaveBeenCalledWith({ provider: 'google', providerId: 'g-1', email: 'new@gmail.com' });
            expect(upsertOAuthUser).not.toHaveBeenCalled();
        });

        it('signs an existing account straight in', async () => {
            (oauthAccountExists as jest.Mock).mockResolvedValue(true);

            const data = await (await send({ deferRole: true })).json();

            expect(data.token).toBe('jwt');
            expect(upsertOAuthUser).toHaveBeenCalled();
        });

        it('creates the account once the role is sent', async () => {
            const data = await (await send({ deferRole: true, role: 'provider' })).json();

            expect(data.token).toBe('jwt');
            expect(oauthAccountExists).not.toHaveBeenCalled();
            expect(upsertOAuthUser).toHaveBeenCalledWith(expect.objectContaining({ role: 'provider' }));
        });

        it('keeps the customer default for older app versions that send no flag', async () => {
            await send({});

            expect(oauthAccountExists).not.toHaveBeenCalled();
            expect(upsertOAuthUser).toHaveBeenCalledWith(expect.objectContaining({ role: 'customer' }));
        });
    });
});
