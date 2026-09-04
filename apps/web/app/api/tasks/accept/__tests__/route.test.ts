import { POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';



jest.mock('@/lib/auth', () => ({ verifyJWTWithVersion: jest.fn(), getBearerToken: jest.fn(() => null) }));
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
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue(mockPayload);
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
        expect((await res1.json()).error).toBe('Заполнены не все поля');

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
        expect(data.error).toBe('Задание не найдено');
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
        expect(data.error).toContain('это не ваше задание');
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
        const mockPendingResponse = { id: 'resp-1', taskId: 'task-1', userId: 'provider-1', status: 'PENDING' };

        // findUnique called twice: before transaction (for ownership check) and after (for response body)
        (prismaMock.task.findUnique as jest.Mock)
            .mockResolvedValueOnce(mockTask)
            .mockResolvedValueOnce(updatedTask);
        (prismaMock.response.findFirst as jest.Mock).mockResolvedValue(mockPendingResponse);
        // $transaction with array — mock to resolve so the route doesn't throw
        (prismaMock.$transaction as jest.Mock).mockResolvedValue([updatedTask, mockPendingResponse, {}]);

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
        expect(prismaMock.response.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ taskId: 'task-1', userId: 'provider-1', status: 'PENDING' }),
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
    it('rejects the other pending bids when one is accepted', async () => {
        const mockTask = { id: 'task-1', userId: mockUserId, title: 'Test Task', status: 'OPEN' };
        const mockPendingResponse = { id: 'resp-1', taskId: 'task-1', userId: 'provider-1', status: 'PENDING' };

        (prismaMock.task.findUnique as jest.Mock)
            .mockResolvedValueOnce(mockTask)
            .mockResolvedValueOnce({ ...mockTask, status: 'IN_PROGRESS', assignedUserId: 'provider-1' });
        (prismaMock.response.findFirst as jest.Mock).mockResolvedValue(mockPendingResponse);
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ locale: 'ru' });
        (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
            (prismaMock.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
            (prismaMock.response.update as jest.Mock).mockResolvedValue(mockPendingResponse);
            (prismaMock.response.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
            (prismaMock.notification.create as jest.Mock).mockResolvedValue({});
            return fn(prismaMock);
        });

        const response = await POST(new NextRequest('http://localhost/api/tasks/accept', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1', providerId: 'provider-1' }),
        }));

        expect(response.status).toBe(200);
        // The winner is flipped to ACCEPTED first, so this sweep can't catch it.
        expect(prismaMock.response.update).toHaveBeenCalledWith({
            where: { id: 'resp-1' },
            data: { status: 'ACCEPTED' },
        });
        expect(prismaMock.response.updateMany).toHaveBeenCalledWith({
            where: { taskId: 'task-1', status: 'PENDING' },
            data: { status: 'REJECTED' },
        });
    });
});
