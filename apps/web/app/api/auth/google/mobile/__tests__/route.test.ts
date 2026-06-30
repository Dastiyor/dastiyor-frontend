import { POST } from '../route';
import { NextRequest } from 'next/server';
import { upsertOAuthUser } from '@/lib/oauth';

jest.mock('@/lib/oauth', () => ({
    upsertOAuthUser: jest.fn(),
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
        expect(data.error).toBe('Access token required');
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
        expect(data.error).toBe('Invalid Google token');
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
        expect(data.error).toBe('Incomplete Google profile');
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
            user: { id: 'user-id-999', email: 'mobileuser@gmail.com', fullName: 'Mobile User', role: 'PROVIDER' },
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
});
