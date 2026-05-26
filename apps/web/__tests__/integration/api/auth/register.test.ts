import { POST } from '@/app/api/auth/register/route';
import { prismaMock } from '../../../mocks/prisma';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/notifications/email';
import { getClientIP, checkRateLimit } from '@/lib/rate-limit';

jest.mock('@/lib/auth', () => ({
    signJWT: jest.fn().mockResolvedValue('mock-jwt-token'),
}));

jest.mock('@/lib/notifications/email', () => ({
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/rate-limit', () => ({
    getClientIP: jest.fn(),
    checkRateLimit: jest.fn(),
    rateLimitExceededResponse: jest.fn().mockReturnValue(
        new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })
    ),
}));

jest.mock('@/lib/audit', () => ({
    logAction: jest.fn(),
    getRequestIP: jest.fn(),
}));

jest.mock('@/lib/validation', () => ({
    validatePassword: jest.fn().mockReturnValue({ valid: true }),
}));

jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('/api/auth/register Route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIP as jest.Mock).mockReturnValue('127.0.0.1');
        (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true });
    });

    it('should return 400 if user already exists', async () => {
        prismaMock.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' } as any);

        const request = new Request('http://localhost/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@test.com', password: 'password123', fullName: 'Test' })
        });

        const response = await POST(request);
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.error).toBe('Пользователь с таким email уже существует');
    });

    it('should create user successfully', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        prismaMock.user.create.mockResolvedValue({
            id: 'new-user-id',
            email: 'new@test.com',
            fullName: 'New User',
            role: 'CUSTOMER'
        } as any);

        const request = new Request('http://localhost/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email: 'new@test.com', password: 'password123', fullName: 'New User', role: 'customer' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.message).toBe('User created successfully');
        expect(data.user.id).toBe('new-user-id');

        // Ensure email notification was sent
        expect(sendWelcomeEmail).toHaveBeenCalledWith('new@test.com', 'New User', 'CUSTOMER');

        // Ensure cookie is set
        const cookieHeader = response.headers.get('set-cookie');
        expect(cookieHeader).toContain('token=mock-jwt-token');
    });
});
