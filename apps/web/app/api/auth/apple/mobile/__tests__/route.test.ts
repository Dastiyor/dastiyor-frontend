import { POST } from '../route';
import { jwtVerify } from 'jose';
import { oauthAccountExists, upsertOAuthUser } from '@/lib/oauth';

jest.mock('jose', () => ({
    createRemoteJWKSet: jest.fn(() => 'jwks'),
    jwtVerify: jest.fn(),
}));
jest.mock('@/lib/oauth', () => ({
    upsertOAuthUser: jest.fn(),
    oauthAccountExists: jest.fn(),
}));
jest.mock('@/lib/rate-limit', () => ({ getClientIP: jest.fn(() => '127.0.0.1') }));

const send = (body: object) =>
    POST(new Request('http://localhost/api/auth/apple/mobile', {
        method: 'POST',
        body: JSON.stringify({ identityToken: 'apple-token', ...body }),
    }));

describe('POST /api/auth/apple/mobile', () => {
    const savedBundle = process.env.APPLE_BUNDLE_ID;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.APPLE_BUNDLE_ID = 'com.dastiyor.app';
        (jwtVerify as jest.Mock).mockResolvedValue({ payload: { sub: 'apple-1', email: 'me@icloud.com' } });
        (upsertOAuthUser as jest.Mock).mockResolvedValue({
            user: { id: 'u1', email: 'me@icloud.com', fullName: 'Me', role: 'PROVIDER', phoneVerified: false },
            token: 'jwt',
            isNew: true,
        });
    });

    afterAll(() => {
        process.env.APPLE_BUNDLE_ID = savedBundle;
    });

    it('requires an identity token', async () => {
        const res = await POST(new Request('http://localhost/api/auth/apple/mobile', {
            method: 'POST',
            body: JSON.stringify({}),
        }));
        expect(res.status).toBe(400);
    });

    it('rejects a token Apple did not sign', async () => {
        (jwtVerify as jest.Mock).mockRejectedValue(new Error('bad'));
        const res = await send({});
        expect(res.status).toBe(401);
        expect(upsertOAuthUser).not.toHaveBeenCalled();
    });

    it('answers roleRequired for a new account when the app defers the role', async () => {
        (oauthAccountExists as jest.Mock).mockResolvedValue(false);

        const res = await send({ deferRole: true, fullName: 'Me' });

        expect(await res.json()).toEqual({ roleRequired: true });
        expect(oauthAccountExists).toHaveBeenCalledWith({ provider: 'apple', providerId: 'apple-1', email: 'me@icloud.com' });
        expect(upsertOAuthUser).not.toHaveBeenCalled();
    });

    it('signs an existing account in even when the role is deferred', async () => {
        (oauthAccountExists as jest.Mock).mockResolvedValue(true);

        const data = await (await send({ deferRole: true })).json();

        expect(data.token).toBe('jwt');
    });

    it('creates the account with the chosen role and the name kept from the first try', async () => {
        const data = await (await send({ deferRole: true, role: 'provider', fullName: 'Me Myself' })).json();

        expect(data.token).toBe('jwt');
        expect(data.user).toEqual(expect.objectContaining({ id: 'u1', role: 'PROVIDER' }));
        expect(oauthAccountExists).not.toHaveBeenCalled();
        expect(upsertOAuthUser).toHaveBeenCalledWith({
            provider: 'apple',
            providerId: 'apple-1',
            email: 'me@icloud.com',
            name: 'Me Myself',
            role: 'provider',
            ipAddress: '127.0.0.1',
        });
    });

    it('keeps the customer default for older app versions', async () => {
        await send({});
        expect(oauthAccountExists).not.toHaveBeenCalled();
        expect(upsertOAuthUser).toHaveBeenCalledWith(expect.objectContaining({ role: 'customer' }));
    });
});
