import { POST } from '../route';
import { prismaMock } from '../../../../__tests__/mocks/prisma';
import { verifyJWT } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// Mock dependencies


jest.mock('@/lib/auth', () => ({
    verifyJWT: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: jest.fn(() => ({ allowed: true })),
    getClientIP: jest.fn(() => '127.0.0.1'),
    rateLimitExceededResponse: jest.fn(),
}));

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

describe('/api/responses', () => {
    const mockUserId = 'user-1';
    const mockToken = 'valid-token';
    const mockPayload = { id: mockUserId, email: 'test@example.com' };

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: mockToken })),
            getAll: jest.fn(() => []),
        });
        (verifyJWT as jest.Mock).mockResolvedValue(mockPayload);
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
            id: mockUserId,
            role: 'PROVIDER',
            subscription: { isActive: true, endDate: new Date(Date.now() + 86400000), plan: 'standard' },
        });
        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue({ userId: 'owner-1', title: 'Test Task' });
        (prismaMock.response.count as jest.Mock).mockResolvedValue(0);
        (prismaMock.notification.create as jest.Mock).mockResolvedValue({});
    });

    describe('GET', () => {
        // GET is not exported from app/api/responses/route.ts
        it.skip('should return 401 if no token provided', async () => {
            (cookies as jest.Mock).mockResolvedValue({
                get: jest.fn(() => undefined),
                getAll: jest.fn(() => []),
            });

            const request = new NextRequest('http://localhost/api/responses?taskId=task-1');
            const response = await (await import('../route')).GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toContain('Unauthorized');
        });

        it.skip('should return 400 if taskId is missing', async () => {
            const request = new NextRequest('http://localhost/api/responses');
            const response = await (await import('../route')).GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('taskId');
        });

        it.skip('should fetch responses for a task', async () => {
            const mockResponses = [
                {
                    id: 'resp-1',
                    message: 'I can help with this',
                    price: '500',
                    status: 'PENDING',
                    user: {
                        id: 'user-2',
                        fullName: 'Provider User',
                    },
                },
            ];

            (prismaMock.response.findMany as jest.Mock).mockResolvedValue(mockResponses);

            const request = new NextRequest('http://localhost/api/responses?taskId=task-1');
            const response = await (await import('../route')).GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.responses).toBeDefined();
            expect(data.responses).toHaveLength(1);
        });
    });

    describe('POST', () => {
        it('should return 401 if no token provided', async () => {
            (cookies as jest.Mock).mockResolvedValue({
                get: jest.fn(() => undefined),
                getAll: jest.fn(() => []),
            });

            const request = new NextRequest('http://localhost/api/responses', {
                method: 'POST',
                body: JSON.stringify({
                    taskId: 'task-1',
                    message: 'I can help',
                    price: '500',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toContain('Unauthorized');
        });

        it('should return 400 if required fields are missing', async () => {
            const request = new NextRequest('http://localhost/api/responses', {
                method: 'POST',
                body: JSON.stringify({
                    taskId: 'task-1',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBeDefined();
        });

        it('should create a response successfully', async () => {
            const mockResponse = {
                id: 'resp-1',
                message: 'I can help with this task',
                price: '500',
                status: 'PENDING',
                taskId: 'task-1',
                userId: mockUserId,
                createdAt: new Date(),
            };

            (prismaMock.response.create as jest.Mock).mockResolvedValue(mockResponse);

            const request = new NextRequest('http://localhost/api/responses', {
                method: 'POST',
                body: JSON.stringify({
                    taskId: 'task-1',
                    message: 'I can help with this task',
                    price: '500',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.response).toBeDefined();
            expect(data.response.message).toBe('I can help with this task');
            expect(prismaMock.response.create).toHaveBeenCalled();
        });

        it('should return 403 if user is not a provider', async () => {
            (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
                id: mockUserId,
                role: 'CUSTOMER',
                subscription: null,
            });

            const request = new NextRequest('http://localhost/api/responses', {
                method: 'POST',
                body: JSON.stringify({
                    taskId: 'task-1',
                    message: 'I can help',
                    price: '500',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.error).toContain('Only providers can respond');
            expect(data.code).toBe('PROVIDER_REQUIRED');
        });

        it('should return 403 if provider has no active subscription', async () => {
            (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
                id: mockUserId,
                role: 'PROVIDER',
                subscription: null,
            });

            const request = new NextRequest('http://localhost/api/responses', {
                method: 'POST',
                body: JSON.stringify({
                    taskId: 'task-1',
                    message: 'I can help',
                    price: '500',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.error).toContain('Active subscription required');
            expect(data.code).toBe('SUBSCRIPTION_REQUIRED');
        });

        it('should return 403 if subscription is expired', async () => {
            (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
                id: mockUserId,
                role: 'PROVIDER',
                subscription: {
                    isActive: true,
                    endDate: new Date(Date.now() - 86400000),
                    plan: 'standard',
                },
            });

            const request = new NextRequest('http://localhost/api/responses', {
                method: 'POST',
                body: JSON.stringify({
                    taskId: 'task-1',
                    message: 'I can help',
                    price: '500',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.code).toBe('SUBSCRIPTION_REQUIRED');
        });

        it('should return 404 if task not found', async () => {
            (prismaMock.task.findUnique as jest.Mock).mockResolvedValue(null);

            const request = new NextRequest('http://localhost/api/responses', {
                method: 'POST',
                body: JSON.stringify({
                    taskId: 'nonexistent',
                    message: 'I can help',
                    price: '500',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe('Task not found');
        });

        it('should create notification for task owner when response is submitted', async () => {
            (prismaMock.response.create as jest.Mock).mockResolvedValue({
                id: 'resp-1',
                taskId: 'task-1',
                userId: mockUserId,
                message: 'Offer',
                price: '500',
                status: 'PENDING',
            });

            const request = new NextRequest('http://localhost/api/responses', {
                method: 'POST',
                body: JSON.stringify({
                    taskId: 'task-1',
                    message: 'Offer',
                    price: '500',
                }),
            });

            await POST(request);

            expect(prismaMock.notification.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId: 'owner-1',
                        type: 'NEW_OFFER',
                        title: 'Новое предложение',
                    }),
                })
            );
        });
    });
});
