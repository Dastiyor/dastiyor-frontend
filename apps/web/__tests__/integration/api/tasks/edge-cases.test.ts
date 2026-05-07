import { POST } from '@/app/api/tasks/route';
import { prismaMock } from '../../../mocks/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getClientIP, checkRateLimit } from '@/lib/rate-limit';

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
    verifyJWT: jest.fn(),
    getBearerToken: jest.fn(() => null),
}));

jest.mock('@/lib/rate-limit', () => ({
    getClientIP: jest.fn(),
    checkRateLimit: jest.fn(),
    rateLimitExceededResponse: jest.fn().mockReturnValue(
        new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 })
    ),
}));

jest.mock('@/lib/audit', () => ({
    logAction: jest.fn(),
    getRequestIP: jest.fn(),
}));

describe('Tasks API Edge Cases & Error Handling', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIP as jest.Mock).mockReturnValue('127.0.0.1');
    });

    it('should block requests exhibiting rapid rate limits', async () => {
        // Mock the rate limiter returning false
        (checkRateLimit as jest.Mock).mockReturnValue({ allowed: false, resetIn: 60 });

        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn().mockReturnValue({ value: 'valid-token' }),
        });
        (verifyJWT as jest.Mock).mockResolvedValue({ id: 'user-1' });

        const request = new Request('http://localhost/api/tasks', { method: 'POST', body: JSON.stringify({}) });
        const response = await POST(request);

        expect(response.status).toBe(429);
        const data = await response.json();
        expect(data.error).toBe('Too Many Requests');
    });

    it('should reject task creation with missing required fields', async () => {
        (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true });

        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn().mockReturnValue({ value: 'valid-token' }),
        });
        (verifyJWT as jest.Mock).mockResolvedValue({ id: 'user-1' });

        const payload = {
            title: 'Sho', // Too short
            description: 'Not enough', // Too short
            // missing category and city
            budget: 'fixed',
            amount: '-500', // Invalid amount
        };

        const request = new Request('http://localhost/api/tasks', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        // Ensure the errors were aggregated by validateTaskInput
        expect(data.error).toContain('Заголовок должен содержать');
        expect(data.error).toContain('Описание должно содержать');
        expect(data.error).toContain('Выберите категорию');
        expect(data.error).toContain('Укажите город');
        expect(data.error).toContain('Бюджет должен быть положительным');

        // Ensure no DB creation was called
        expect(prismaMock.task.create).not.toHaveBeenCalled();
    });

    it('should gracefully handle unexpected database failures (500 Server Error)', async () => {
        (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true });

        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn().mockReturnValue({ value: 'valid-token' }),
        });
        (verifyJWT as jest.Mock).mockResolvedValue({ id: 'user-1' });

        const validPayload = {
            title: 'Valid Task Title Name',
            description: 'This is a sufficiently long description for a task',
            category: 'Cleaning',
            budget: 'fixed',
            amount: '500',
            city: 'Dushanbe'
        };

        // Simulate DB crash
        prismaMock.task.create.mockRejectedValue(new Error('Connection Pool Exhausted'));

        const request = new Request('http://localhost/api/tasks', {
            method: 'POST',
            body: JSON.stringify(validPayload)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal Server Error');
    });

    it('should reject if token is present but verification fails (expired/malformed)', async () => {
        (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true });

        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn().mockReturnValue({ value: 'expired-malformed-token' }),
        });

        // JWT library returns null on failure
        (verifyJWT as jest.Mock).mockResolvedValue(null);

        const request = new Request('http://localhost/api/tasks', { method: 'POST', body: JSON.stringify({}) });
        const response = await POST(request);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Unauthorized: Invalid token');
    });

});
