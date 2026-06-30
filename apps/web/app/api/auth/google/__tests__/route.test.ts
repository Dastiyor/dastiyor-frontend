import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('GET /api/auth/google', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        process.env.GOOGLE_CLIENT_ID = 'test-client-id';
        process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should redirect to Google OAuth login page with correct parameters', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/google?role=provider');
        const response = await GET(request);

        expect(response.status).toBe(307);
        const redirectUrl = response.headers.get('location')!;
        expect(redirectUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
        
        const urlParams = new URLSearchParams(redirectUrl.split('?')[1]);
        expect(urlParams.get('client_id')).toBe('test-client-id');
        expect(urlParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/google/callback');
        expect(urlParams.get('response_type')).toBe('code');
        expect(urlParams.get('scope')).toBe('openid email profile');
        expect(urlParams.get('prompt')).toBe('select_account');

        const stateBase64 = urlParams.get('state');
        expect(stateBase64).toBeDefined();
        const stateObj = JSON.parse(Buffer.from(stateBase64!, 'base64url').toString());
        expect(stateObj.role).toBe('provider');
        expect(stateObj.nonce).toBeDefined();

        const cookieHeader = response.headers.get('set-cookie');
        expect(cookieHeader).toContain('oauth_state_nonce');
    });

    it('should fail gracefully if GOOGLE_CLIENT_ID is not configured', async () => {
        delete process.env.GOOGLE_CLIENT_ID;
        const request = new NextRequest('http://localhost:3000/api/auth/google');
        const response = await GET(request);

        expect(response.status).toBe(307);
        const redirectUrl = response.headers.get('location')!;
        expect(redirectUrl).toBe('http://localhost:3000/login?error=oauth_unavailable');
    });
});
