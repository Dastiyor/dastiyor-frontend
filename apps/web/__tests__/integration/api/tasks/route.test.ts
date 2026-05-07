import { GET, POST } from '@/app/api/tasks/route';
import { prismaMock } from '../../../mocks/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getClientIP, checkRateLimit } from '@/lib/rate-limit';

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
    verifyJWT: jest.fn(),
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
    validateTaskInput: jest.fn().mockReturnValue({ isValid: true }),
}));

describe('/api/tasks Route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIP as jest.Mock).mockReturnValue('127.0.0.1');
        (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true });
    });

    describe('GET /api/tasks', () => {
        it('should return a list of tasks with pagination', async () => {
            const mockTasks = [
                {
                    id: '1',
                    title: 'Test Task',
                    status: 'OPEN',
                    category: 'Cleaning',
                    budgetType: 'fixed',
                    budgetAmount: '500',
                    city: 'Dushanbe',
                    createdAt: new Date(),
                    urgency: 'normal',
                    _count: { responses: 0 },
                    user: { fullName: 'Ali' },
                    responses: []
                }
            ];

            // Mock prisma count and findMany
            prismaMock.task.count.mockResolvedValue(1);
            prismaMock.task.findMany.mockResolvedValue(mockTasks as any);

            const request = new Request('http://localhost/api/tasks?page=1&limit=10');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.tasks).toHaveLength(1);
            expect(data.pagination.total).toBe(1);
            expect(prismaMock.task.findMany).toHaveBeenCalled();
        });
    });

    describe('POST /api/tasks', () => {
        it('should return 401 if unauthorized', async () => {
            (cookies as jest.Mock).mockResolvedValue({
                get: jest.fn().mockReturnValue(undefined),
                getAll: jest.fn().mockReturnValue([]),
            });

            const request = new Request('http://localhost/api/tasks', { method: 'POST', body: JSON.stringify({}) });
            const response = await POST(request);
            expect(response.status).toBe(401);
        });

        it('should create a task successfully if authorized', async () => {
            (cookies as jest.Mock).mockResolvedValue({
                get: jest.fn().mockReturnValue({ value: 'valid-token' }),
            });
            (verifyJWT as jest.Mock).mockResolvedValue({ id: 'user-id' });

            const payload = {
                title: 'Clean my house',
                description: 'Needs deep cleaning',
                category: 'Cleaning',
                budget: 'fixed',
                amount: '500',
                city: 'Dushanbe'
            };

            prismaMock.task.create.mockResolvedValue({ id: 'task-id', ...payload } as any);

            const request = new Request('http://localhost/api/tasks', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.message).toBe('Task created successfully');
            expect(prismaMock.task.create).toHaveBeenCalled();
        });
    });
});
