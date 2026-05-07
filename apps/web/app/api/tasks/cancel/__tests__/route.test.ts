import { POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { verifyJWT } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';



jest.mock('@/lib/auth', () => ({ verifyJWT: jest.fn(), getBearerToken: jest.fn(() => null) }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

describe('/api/tasks/cancel', () => {
    const mockUserId = 'customer-1';
    const mockPayload = { id: mockUserId };

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: 'token' })),
        });
        (verifyJWT as jest.Mock).mockResolvedValue(mockPayload);
    });

    it('should return 401 if no token', async () => {
        (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

        const request = new NextRequest('http://localhost/api/tasks/cancel', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1' }),
        });

        const response = await POST(request);
        expect(response.status).toBe(401);
    });

    it('should return 400 if taskId is missing', async () => {
        const request = new NextRequest('http://localhost/api/tasks/cancel', {
            method: 'POST',
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Task ID is required');
    });

    it('should return 404 if task not found', async () => {
        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue(null);

        const request = new NextRequest('http://localhost/api/tasks/cancel', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'nonexistent' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Task not found');
    });

    it('should return 403 if user is not task owner', async () => {
        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
            id: 'task-1',
            userId: 'other-owner',
            status: 'OPEN',
        });

        const request = new NextRequest('http://localhost/api/tasks/cancel', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toContain('Only task owner');
    });

    it('should return 400 if task is not OPEN', async () => {
        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
            id: 'task-1',
            userId: mockUserId,
            status: 'IN_PROGRESS',
        });

        const request = new NextRequest('http://localhost/api/tasks/cancel', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Only open tasks');
    });

    it('should cancel task and set status to CANCELLED', async () => {
        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
            id: 'task-1',
            userId: mockUserId,
            status: 'OPEN',
        });
        (prismaMock.response.findMany as jest.Mock).mockResolvedValue([]);
        (prismaMock.task.update as jest.Mock).mockResolvedValue({
            id: 'task-1',
            status: 'CANCELLED',
        });

        const request = new NextRequest('http://localhost/api/tasks/cancel', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Task cancelled successfully');
        expect(prismaMock.task.update).toHaveBeenCalledWith({
            where: { id: 'task-1' },
            data: { status: 'CANCELLED' },
        });
    });

    it('should handle server errors', async () => {
        (prismaMock.task.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

        const request = new NextRequest('http://localhost/api/tasks/cancel', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1' }),
        });

        const response = await POST(request);
        expect(response.status).toBe(500);
    });
});
