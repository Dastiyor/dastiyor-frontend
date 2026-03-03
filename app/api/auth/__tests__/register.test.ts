import { POST } from '../register/route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    },
}));

jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: jest.fn(() => ({ allowed: true })),
    getClientIP: jest.fn(() => '127.0.0.1'),
    rateLimitExceededResponse: jest.fn(),
}));

jest.mock('@/lib/validation', () => ({
    validatePassword: jest.fn((p: string) => ({
        valid: p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p),
        error: undefined,
    })),
}));

describe('/api/auth/register', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if required fields are missing', async () => {
        const request = new NextRequest('http://localhost/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email: 'test@example.com',
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
    });

    it('should return 400 if email is already registered', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'existing@example.com',
        });

        const request = new NextRequest('http://localhost/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email: 'existing@example.com',
                password: 'Password123',
                fullName: 'Test User',
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('already exists');
    });

    it('should create a new user successfully', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.user.create as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'newuser@example.com',
            fullName: 'New User',
            role: 'CUSTOMER',
            password: 'hashed-password',
        });

        const request = new NextRequest('http://localhost/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email: 'newuser@example.com',
                password: 'Password123',
                fullName: 'New User',
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.user).toBeDefined();
        expect(data.user.email).toBe('newuser@example.com');
        expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should hash password before storing', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.user.create as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'newuser@example.com',
            fullName: 'New User',
            role: 'CUSTOMER',
        });

        const request = new NextRequest('http://localhost/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email: 'newuser@example.com',
                password: 'Password123',
                fullName: 'New User',
            }),
        });

        await POST(request);

        expect(prisma.user.create).toHaveBeenCalled();
        const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
        expect(createCall.data.password).not.toBe('Password123');
    });
});
