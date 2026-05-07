import { POST } from '../login/route';
import { prismaMock } from '../../../../__tests__/mocks/prisma';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { signJWT } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: jest.fn(() => ({ allowed: true })),
    getClientIP: jest.fn(() => '127.0.0.1'),
    rateLimitExceededResponse: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
    signJWT: jest.fn().mockResolvedValue('mock-jwt-token'),
}));

jest.mock('@/lib/audit', () => ({
    logAction: jest.fn(),
    getRequestIP: jest.fn(),
}));

describe('/api/auth/login', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if email or password is missing', async () => {
        const request = new NextRequest('http://localhost/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Email and password are required');
    });

    it('should return 401 for invalid credentials', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        const request = new NextRequest('http://localhost/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'nonexistent@example.com',
                password: 'password123',
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Invalid credentials');
    });

    it('should return 401 for incorrect password', async () => {
        const hashedPassword = await bcrypt.hash('correctpassword', 10);
        prismaMock.user.findUnique.mockResolvedValue({
            id: 'user-1',
            email: 'test@example.com',
            password: hashedPassword,
            fullName: 'Test User',
            role: 'CUSTOMER',
        } as any);

        const request = new NextRequest('http://localhost/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'wrongpassword',
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Invalid credentials');
    });

    it('should return 200 and set cookie for valid credentials', async () => {
        const hashedPassword = await bcrypt.hash('correctpassword', 10);
        prismaMock.user.findUnique.mockResolvedValue({
            id: 'user-1',
            email: 'test@example.com',
            password: hashedPassword,
            fullName: 'Test User',
            role: 'CUSTOMER',
        } as any);

        const request = new NextRequest('http://localhost/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'correctpassword',
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Login successful');
        expect(data.user).toBeDefined();
        expect(data.user.email).toBe('test@example.com');

        // Check if cookie is set
        const setCookieHeader = response.headers.get('set-cookie');
        expect(setCookieHeader).toBeDefined();
        expect(setCookieHeader).toContain('token=');
    });

    it('should handle database errors gracefully', async () => {
        prismaMock.user.findUnique.mockRejectedValue(
            new Error('Database error')
        );

        const request = new NextRequest('http://localhost/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123',
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal Server Error');
    });
});
