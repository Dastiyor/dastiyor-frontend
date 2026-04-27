import { POST, GET } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { checkRateLimit } from '@/lib/rate-limit';

jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: jest.fn(),
    getClientIP: jest.fn().mockReturnValue('127.0.0.1'),
    rateLimitExceededResponse: jest.fn(),
}));

describe('/api/auth/reset-password', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true, remaining: 4, resetIn: 60000 });
    });

    describe('POST', () => {
        it('should return 400 if token or password is missing', async () => {
            const req1 = new NextRequest('http://localhost/api/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ password: 'newpass123' }),
            });
            const res1 = await POST(req1);
            expect(res1.status).toBe(400);
            expect((await res1.json()).error).toContain('Token and password');

            const req2 = new NextRequest('http://localhost/api/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ token: 'abc123' }),
            });
            const res2 = await POST(req2);
            expect(res2.status).toBe(400);
        });

        it('should return 400 if password is shorter than 8 characters', async () => {
            const request = new NextRequest('http://localhost/api/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ token: 'valid-token', password: '1234567' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('at least 8 characters');
        });

        it('should return 400 if token is invalid or expired', async () => {
            (prismaMock.passwordReset.findFirst as jest.Mock).mockResolvedValue(null);

            const request = new NextRequest('http://localhost/api/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ token: 'invalid', password: 'newpass123' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('Invalid or expired');
        });

        it('should reset password and mark token as used', async () => {
            const futureDate = new Date(Date.now() + 3600000);
            (prismaMock.passwordReset.findFirst as jest.Mock).mockResolvedValue({
                id: 'reset-1',
                userId: 'user-1',
                token: 'valid-token',
                used: false,
                expiresAt: futureDate,
                user: { id: 'user-1' },
            });
            (prismaMock.user.update as jest.Mock).mockResolvedValue({});
            (prismaMock.passwordReset.update as jest.Mock).mockResolvedValue({});

            const request = new NextRequest('http://localhost/api/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ token: 'valid-token', password: 'newSecurePass123' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toContain('reset successfully');
            expect(prismaMock.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: expect.objectContaining({
                    password: expect.any(String),
                }),
            });
            expect(prismaMock.passwordReset.update).toHaveBeenCalledWith({
                where: { id: 'reset-1' },
                data: { used: true },
            });
        });

        it('should hash the new password', async () => {
            (prismaMock.passwordReset.findFirst as jest.Mock).mockResolvedValue({
                id: 'reset-1',
                userId: 'user-1',
                token: 'valid-token',
                used: false,
                expiresAt: new Date(Date.now() + 3600000),
                user: { id: 'user-1' },
            });
            (prismaMock.user.update as jest.Mock).mockImplementation((args: any) => {
                expect(args.data.password).not.toBe('Plaintext1');
                return Promise.resolve({});
            });
            (prismaMock.passwordReset.update as jest.Mock).mockResolvedValue({});

            const request = new NextRequest('http://localhost/api/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ token: 'valid-token', password: 'Plaintext1' }),
            });

            await POST(request);
            expect(prismaMock.user.update).toHaveBeenCalled();
        });
    });

    describe('GET', () => {
        it('should return 400 if token is missing', async () => {
            const request = new NextRequest('http://localhost/api/auth/reset-password');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.valid).toBe(false);
            expect(data.error).toContain('Token is required');
        });

        it('should return valid: true when token is valid', async () => {
            (prismaMock.passwordReset.findFirst as jest.Mock).mockResolvedValue({
                id: 'reset-1',
                token: 'valid-token',
                used: false,
                expiresAt: new Date(Date.now() + 3600000),
            });

            const request = new NextRequest('http://localhost/api/auth/reset-password?token=valid-token');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.valid).toBe(true);
        });

        it('should return valid: false when token is invalid or expired', async () => {
            (prismaMock.passwordReset.findFirst as jest.Mock).mockResolvedValue(null);

            const request = new NextRequest('http://localhost/api/auth/reset-password?token=invalid');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.valid).toBe(false);
        });
    });
});
