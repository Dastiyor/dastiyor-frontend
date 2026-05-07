import { POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { verifyJWT } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';



jest.mock('@/lib/auth', () => ({ verifyJWT: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

describe('/api/tasks/accept', () => {
    const mockUserId = 'customer-1';
    const mockToken = 'valid-token';
    const mockPayload = { id: mockUserId, email: 'customer@example.com' };

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: mockToken })),
        });
        (verifyJWT as jest.Mock).mockResolvedValue(mockPayload);
    });

    it('should return 401 if no token provided', async () => {
        (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

        const request = new NextRequest('http://localhost/api/tasks/accept', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1', providerId: 'provider-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if taskId or providerId is missing', async () => {
        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue(null);

        const req1 = new NextRequest('http://localhost/api/tasks/accept', {
            method: 'POST',
            body: JSON.stringify({ providerId: 'provider-1' }),
        });
        const res1 = await POST(req1);
        expect(res1.status).toBe(400);
        expect((await res1.json()).error).toBe('Missing fields');

        const req2 = new NextRequest('http://localhost/api/tasks/accept', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1' }),
        });
        const res2 = await POST(req2);
        expect(res2.status).toBe(400);
    });

    it('should return 404 if task not found', async () => {
        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue(null);

        const request = new NextRequest('http://localhost/api/tasks/accept', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'nonexistent', providerId: 'provider-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Task not found');
    });

    it('should return 403 if user does not own the task', async () => {
        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
            id: 'task-1',
            userId: 'other-owner',
            title: 'Test Task',
        });

        const request = new NextRequest('http://localhost/api/tasks/accept', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1', providerId: 'provider-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toContain('do not own');
    });

    it('should accept offer and update task status to IN_PROGRESS', async () => {
        const mockTask = {
            id: 'task-1',
            userId: mockUserId,
            title: 'Test Task',
            status: 'OPEN',
        };
        const updatedTask = {
            ...mockTask,
            status: 'IN_PROGRESS',
            assignedUserId: 'provider-1',
        };

        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
        (prismaMock.task.update as jest.Mock).mockResolvedValue(updatedTask);
        (prismaMock.notification.create as jest.Mock).mockResolvedValue({});

        const request = new NextRequest('http://localhost/api/tasks/accept', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1', providerId: 'provider-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Task accepted');
        expect(data.task.status).toBe('IN_PROGRESS');
        expect(data.task.assignedUserId).toBe('provider-1');
        expect(prismaMock.task.update).toHaveBeenCalledWith({
            where: { id: 'task-1' },
            data: { status: 'IN_PROGRESS', assignedUserId: 'provider-1' },
        });
        expect(prismaMock.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'provider-1',
                    type: 'OFFER_ACCEPTED',
                }),
            })
        );
    });

    it('should handle server errors', async () => {
        (prismaMock.task.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

        const request = new NextRequest('http://localhost/api/tasks/accept', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1', providerId: 'provider-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal Server Error');
    });
});
