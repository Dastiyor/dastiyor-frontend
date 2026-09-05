import { POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { sendPushNotification } from '@/lib/web-push';



jest.mock('@/lib/auth', () => ({ verifyJWTWithVersion: jest.fn(), getBearerToken: jest.fn(() => null) }));
jest.mock('@/lib/web-push', () => ({ sendPushNotification: jest.fn().mockResolvedValue(undefined) }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

describe('/api/tasks/complete', () => {
    const mockUserId = 'customer-1';
    const mockPayload = { id: mockUserId };

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: 'token' })),
        });
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue(mockPayload);
    });

    it('should return 401 if no token', async () => {
        (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

        const request = new NextRequest('http://localhost/api/tasks/complete', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1' }),
        });

        const response = await POST(request);
        expect(response.status).toBe(401);
    });

    it('should return 400 if taskId is missing', async () => {
        const request = new NextRequest('http://localhost/api/tasks/complete', {
            method: 'POST',
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Не указан ID задания');
    });

    it('should return 404 if task not found', async () => {
        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue(null);

        const request = new NextRequest('http://localhost/api/tasks/complete', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'nonexistent' }),
        });

        const response = await POST(request);
        expect(response.status).toBe(404);
        expect((await response.json()).error).toBe('Задание не найдено');
    });

    it('should return 403 if user does not own the task', async () => {
        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
            id: 'task-1',
            userId: 'other-owner',
            title: 'Task',
            status: 'IN_PROGRESS',
        });

        const request = new NextRequest('http://localhost/api/tasks/complete', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toContain('это не ваше задание');
    });

    it('should return 400 if task is not IN_PROGRESS', async () => {
        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
            id: 'task-1',
            userId: mockUserId,
            title: 'Task',
            status: 'OPEN',
        });

        const request = new NextRequest('http://localhost/api/tasks/complete', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Завершить можно только задание в работе');
    });

    it('should complete task and update status to COMPLETED', async () => {
        const mockTask = {
            id: 'task-1',
            userId: mockUserId,
            title: 'Task',
            status: 'IN_PROGRESS',
            assignedUserId: 'provider-1',
            budgetType: 'fixed',
            budgetAmount: '500',
        };
        const completedTask = { ...mockTask, status: 'COMPLETED' };

        (prismaMock.task.findUnique as jest.Mock)
            .mockResolvedValueOnce(mockTask)       // initial load for pre-checks
            .mockResolvedValueOnce(completedTask); // in-transaction return of the updated row
        // $transaction callback — call the callback with prismaMock so inner updates are tracked
        (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
            (prismaMock.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 }); // atomic claim wins
            (prismaMock.user.update as jest.Mock).mockResolvedValue({});
            return fn(prismaMock);
        });
        (prismaMock.notification.create as jest.Mock).mockResolvedValue({});

        const request = new NextRequest('http://localhost/api/tasks/complete', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Task completed');
        expect(data.task.status).toBe('COMPLETED');
        expect(prismaMock.notification.create).toHaveBeenCalled();
    });

    it('should increment provider balance for fixed budget task', async () => {
        const mockTask = {
            id: 'task-1',
            userId: mockUserId,
            title: 'Task',
            status: 'IN_PROGRESS',
            assignedUserId: 'provider-1',
            budgetType: 'fixed',
            budgetAmount: '500',
            budgetAmountNum: 500, // integer column used for accurate balance increment
        };

        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
        (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
            (prismaMock.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 }); // atomic claim wins
            (prismaMock.user.update as jest.Mock).mockResolvedValue({});
            return fn(prismaMock);
        });
        (prismaMock.notification.create as jest.Mock).mockResolvedValue({});

        const request = new NextRequest('http://localhost/api/tasks/complete', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1' }),
        });

        await POST(request);

        expect(prismaMock.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'provider-1' },
                data: { balance: { increment: 500 } },
            })
        );
    });
    it('does not credit balance when the atomic claim is lost (concurrent duplicate complete)', async () => {
        const mockTask = {
            id: 'task-1',
            userId: mockUserId,
            title: 'Task',
            status: 'IN_PROGRESS',
            assignedUserId: 'provider-1',
            budgetType: 'fixed',
            budgetAmount: '500',
            budgetAmountNum: 500,
        };

        (prismaMock.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
        // Loser: another request already flipped the task, so updateMany matches 0 rows.
        (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
            (prismaMock.task.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
            return fn(prismaMock);
        });

        const request = new NextRequest('http://localhost/api/tasks/complete', {
            method: 'POST',
            body: JSON.stringify({ taskId: 'task-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Завершить можно только задание в работе');
        // Critical: the provider balance must NOT be credited a second time.
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('pushes to the assigned provider on completion', async () => {
        // Being told the job is done -- and the balance credited -- should not
        // require opening the app to notice.
        const mockTask = {
            id: 'task-1', userId: mockUserId, title: 'Job', status: 'IN_PROGRESS',
            assignedUserId: 'provider-1', budgetType: 'fixed', budgetAmount: '150',
        };
        (prismaMock.task.findUnique as jest.Mock)
            .mockResolvedValueOnce(mockTask)
            .mockResolvedValueOnce({ ...mockTask, status: 'COMPLETED' });
        (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
            (prismaMock.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
            (prismaMock.user.update as jest.Mock).mockResolvedValue({});
            return fn(prismaMock);
        });
        (prismaMock.notification.create as jest.Mock).mockResolvedValue({});
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ email: 'p@x.com' });

        await POST(new NextRequest('http://localhost/api/tasks/complete', {
            method: 'POST', body: JSON.stringify({ taskId: 'task-1' }),
        }));

        expect(sendPushNotification).toHaveBeenCalledWith('provider-1', expect.objectContaining({
            url: '/tasks/task-1',
        }));
    });
    it('marks the accepted response COMPLETED so the provider stops seeing "Accepted"', async () => {
        const mockTask = {
            id: 'task-1', userId: mockUserId, title: 'Job', status: 'IN_PROGRESS',
            assignedUserId: 'provider-1', budgetType: 'fixed', budgetAmount: '150',
        };
        (prismaMock.task.findUnique as jest.Mock)
            .mockResolvedValueOnce(mockTask)
            .mockResolvedValueOnce({ ...mockTask, status: 'COMPLETED' });
        (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
            (prismaMock.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
            (prismaMock.response.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
            (prismaMock.user.update as jest.Mock).mockResolvedValue({});
            return fn(prismaMock);
        });
        (prismaMock.notification.create as jest.Mock).mockResolvedValue({});
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ email: 'p@x.com' });

        await POST(new NextRequest('http://localhost/api/tasks/complete', {
            method: 'POST', body: JSON.stringify({ taskId: 'task-1' }),
        }));

        expect(prismaMock.response.updateMany).toHaveBeenCalledWith({
            where: { taskId: 'task-1', userId: 'provider-1', status: 'ACCEPTED' },
            data: { status: 'COMPLETED' },
        });
        // Accepting kept the reserve bids PENDING; finishing the job closes them.
        expect(prismaMock.response.updateMany).toHaveBeenCalledWith({
            where: { taskId: 'task-1', status: 'PENDING' },
            data: { status: 'REJECTED' },
        });
    });
});
