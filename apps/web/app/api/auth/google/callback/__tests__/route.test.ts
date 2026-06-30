import { GET } from '../route';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { upsertOAuthUser } from '@/lib/oauth';

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('@/lib/oauth', () => ({
    upsertOAuthUser: jest.fn(),
    oauthCookieOptions: jest.fn(() => ({})),
}));

jest.mock('@/lib/rate-limit', () => ({
    getClientIP: jest.fn(() => '127.0.0.1'),
}));

describe('GET /api/auth/google/callback', () => {
    const originalEnv = process.env;
    let mockFetch: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.GOOGLE_CLIENT_ID = 'test-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
        process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

        mockFetch = jest.fn();
        global.fetch = mockFetch;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should redirect with oauth_cancelled error if code is missing or google cancelled', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/google/callback?error=access_denied');
        const response = await GET(request);

        expect(response.status).toBe(307);
        expect(response.headers.get('location')).toBe('http://localhost:3000/login?error=oauth_cancelled');
    });

    it('should redirect with oauth_failed if state nonce and cookie nonce do not match', async () => {
        const state = Buffer.from(JSON.stringify({ role: 'customer', nonce: 'nonce-123' })).toString('base64url');
        const request = new NextRequest(`http://localhost:3000/api/auth/google/callback?code=some-code&state=${state}`);

        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn((name) => {
                if (name === 'oauth_state_nonce') return { value: 'different-nonce' };
                return undefined;
            }),
        });

        const response = await GET(request);
        expect(response.status).toBe(307);
        expect(response.headers.get('location')).toBe('http://localhost:3000/login?error=oauth_failed');
    });

    it('should complete Google Login successfully when state is valid and tokens are exchanged', async () => {
        const state = Buffer.from(JSON.stringify({ role: 'provider', nonce: 'nonce-123' })).toString('base64url');
        const request = new NextRequest(`http://localhost:3000/api/auth/google/callback?code=good-code&state=${state}`);

        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn((name) => {
                if (name === 'oauth_state_nonce') return { value: 'nonce-123' };
                return undefined;
            }),
        });

        mockFetch.mockImplementation(async (url: string) => {
            if (url === 'https://oauth2.googleapis.com/token') {
                return {
                    ok: true,
                    json: async () => ({ access_token: 'mock-access-token' }),
                };
            }
            if (url === 'https://www.googleapis.com/oauth2/v3/userinfo') {
                return {
                    ok: true,
                    json: async () => ({
                        sub: 'google-sub-id',
                        email: 'testuser@gmail.com',
                        name: 'Test Google User',
                    }),
                };
            }
            return { ok: false };
        });

        (upsertOAuthUser as jest.Mock).mockResolvedValue({
            user: { id: 'user-id-1', email: 'testuser@gmail.com', role: 'PROVIDER' },
            token: 'mock-jwt-cookie-token',
            isNew: true,
        });

        const response = await GET(request);

        expect(response.status).toBe(307);
        expect(response.headers.get('location')).toBe('http://localhost:3000/provider');

        expect(upsertOAuthUser).toHaveBeenCalledWith({
            provider: 'google',
            providerId: 'google-sub-id',
            email: 'testuser@gmail.com',
            name: 'Test Google User',
            role: 'provider',
            ipAddress: '127.0.0.1',
        });

        const cookieHeader = response.headers.get('set-cookie');
        expect(cookieHeader).toContain('token=mock-jwt-cookie-token');
    });

    it('should fail gracefully if credentials are not configured', async () => {
        delete process.env.GOOGLE_CLIENT_ID;
        const request = new NextRequest('http://localhost:3000/api/auth/google/callback?code=some-code');
        const response = await GET(request);

        expect(response.status).toBe(307);
        expect(response.headers.get('location')).toBe('http://localhost:3000/login?error=oauth_unavailable');
    });
});
