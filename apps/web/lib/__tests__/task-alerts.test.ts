import { prismaMock } from '../../__tests__/mocks/prisma';
import { after } from 'next/server';
import { sendPushToMany } from '@/lib/web-push';
import { logger } from '@/lib/logger';
import {
    alertPlan, dispatchTaskAlerts, drainTaskAlerts, queueTaskAlerts,
    MAX_RECIPIENTS, PRO_DELAY_MS,
} from '@/lib/task-alerts';

jest.mock('next/server', () => ({ after: jest.fn() }));
jest.mock('@/lib/web-push', () => ({ sendPushToMany: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }));

const NOW = new Date('2026-11-13T10:00:00Z');
const FUTURE = new Date('2026-12-13T10:00:00Z');

const task = {
    id: 't1', title: 'Почистить ковёр', category: 'Уборка', city: 'Душанбе',
    userId: 'author', createdAt: NOW,
};

const provider = (id: string, plan: string | null, locale = 'ru') => ({
    id, locale, subscription: plan ? { plan } : null,
});

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('alertPlan', () => {
    it('is null without an active, unexpired subscription', () => {
        expect(alertPlan(null, NOW)).toBeNull();
        expect(alertPlan({ plan: 'pro', isActive: false, endDate: FUTURE }, NOW)).toBeNull();
        expect(alertPlan({ plan: 'pro', isActive: true, endDate: NOW }, NOW)).toBeNull();
    });

    it('reads legacy ids as the new plans', () => {
        expect(alertPlan({ plan: 'basic', isActive: true, endDate: FUTURE }, NOW)).toBe('pro');
        expect(alertPlan({ plan: 'business', isActive: true, endDate: FUTURE }, NOW)).toBe('business');
    });

    it('defaults now to the current time', () => {
        expect(alertPlan({ plan: 'pro', isActive: true, endDate: new Date(Date.now() + 60_000) })).toBe('pro');
    });
});

describe('dispatchTaskAlerts', () => {
    it('queries matching paid providers only, without the author', async () => {
        prismaMock.user.findMany.mockResolvedValue([]);
        await dispatchTaskAlerts(task, NOW);

        expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                role: 'PROVIDER',
                taskAlertsEnabled: true,
                id: { not: 'author' },
                categories: { has: 'Уборка' },
                subscription: { is: { isActive: true, endDate: { gt: NOW } } },
                OR: [{ city: null }, { city: 'Душанбе' }],
            },
            take: MAX_RECIPIENTS,
        }));
        expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
        expect(prismaMock.taskAlert.createMany).not.toHaveBeenCalled();
        expect(sendPushToMany).not.toHaveBeenCalled();
    });

    it('sends an online task to every city', async () => {
        prismaMock.user.findMany.mockResolvedValue([]);
        await dispatchTaskAlerts({ ...task, city: 'Онлайн' }, NOW);
        const where = prismaMock.user.findMany.mock.calls[0][0]!.where!;
        expect(where).not.toHaveProperty('OR');
    });

    it('alerts PRO+ and BUSINESS at once, queues PRO, ignores FREE and unknown plans', async () => {
        prismaMock.user.findMany.mockResolvedValue([
            provider('p-plus', 'pro_plus', 'tj'),
            provider('biz', 'premium', 'en'),
            provider('pro', 'pro'),
            provider('legacy-pro', 'basic'),
            provider('odd', 'gold'),
            provider('none', null),
        ] as never);
        prismaMock.notification.createMany.mockResolvedValue({ count: 2 });
        prismaMock.taskAlert.createMany.mockResolvedValue({ count: 2 });

        const result = await dispatchTaskAlerts(task, NOW);

        expect(result).toEqual({ immediate: 2, queued: 2 });
        expect(prismaMock.taskAlert.createMany).toHaveBeenCalledWith({
            data: [
                { taskId: 't1', userId: 'pro', dueAt: new Date(NOW.getTime() + PRO_DELAY_MS) },
                { taskId: 't1', userId: 'legacy-pro', dueAt: new Date(NOW.getTime() + PRO_DELAY_MS) },
            ],
            skipDuplicates: true,
        });

        const rows = prismaMock.notification.createMany.mock.calls[0][0]!.data as unknown as Array<Record<string, string>>;
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({
            userId: 'p-plus', type: 'NEW_TASK', link: '/tasks/t1',
            title: 'Супориши нав: Тозакунӣ', message: '"Почистить ковёр" — аввалин шуда посух диҳед',
        });
        expect(JSON.parse(rows[0].params)).toEqual({ task: 'Почистить ковёр', category: 'Уборка' });
        // No English category names on the server: falls back to the Russian one
        expect(rows[1]).toMatchObject({ userId: 'biz', title: 'New task: Уборка' });

        expect(sendPushToMany).toHaveBeenCalledWith([
            { userId: 'p-plus', payload: { title: 'Супориши нав: Тозакунӣ', body: rows[0].message, url: '/tasks/t1' } },
            { userId: 'biz', payload: { title: 'New task: Уборка', body: rows[1].message, url: '/tasks/t1' } },
        ]);
    });

    it('uses the current time by default', async () => {
        prismaMock.user.findMany.mockResolvedValue([]);
        await expect(dispatchTaskAlerts(task)).resolves.toEqual({ immediate: 0, queued: 0 });
    });
});

describe('queueTaskAlerts', () => {
    it('hands the work to after()', async () => {
        prismaMock.user.findMany.mockResolvedValue([]);
        queueTaskAlerts(task);
        expect(after).toHaveBeenCalledTimes(1);
        const run = (after as jest.Mock).mock.calls[0][0] as () => Promise<void>;
        await run();
        expect(prismaMock.user.findMany).toHaveBeenCalled();
    });

    it('falls back to fire-and-forget outside a request, and only logs a failure', async () => {
        (after as jest.Mock).mockImplementationOnce(() => { throw new Error('outside request scope'); });
        prismaMock.user.findMany.mockRejectedValue(new Error('db down'));

        expect(() => queueTaskAlerts(task)).not.toThrow();
        await flush();

        expect(logger.error).toHaveBeenCalledWith('Task alerts failed', { taskId: 't1', error: 'db down' });
    });

    it('logs a non-Error failure as text', async () => {
        (after as jest.Mock).mockImplementationOnce(() => { throw new Error('outside request scope'); });
        prismaMock.user.findMany.mockRejectedValue('boom');
        queueTaskAlerts(task);
        await flush();
        expect(logger.error).toHaveBeenCalledWith('Task alerts failed', { taskId: 't1', error: 'boom' });
    });
});

describe('drainTaskAlerts', () => {
    beforeEach(() => {
        prismaMock.taskAlert.updateMany.mockResolvedValue({ count: 0 });
        prismaMock.taskAlert.deleteMany.mockResolvedValue({ count: 0 });
        prismaMock.notification.createMany.mockResolvedValue({ count: 0 });
    });

    it('drops alerts older than 2 hours and prunes old finished rows', async () => {
        prismaMock.taskAlert.updateMany.mockResolvedValueOnce({ count: 3 });
        prismaMock.taskAlert.findMany.mockResolvedValue([]);
        prismaMock.taskAlert.deleteMany.mockResolvedValue({ count: 4 });

        const result = await drainTaskAlerts(NOW);

        expect(prismaMock.taskAlert.updateMany).toHaveBeenCalledWith({
            where: { status: 'PENDING', createdAt: { lt: new Date('2026-11-13T08:00:00Z') } },
            data: { status: 'DROPPED' },
        });
        expect(prismaMock.taskAlert.deleteMany).toHaveBeenCalledWith({
            where: { status: { not: 'PENDING' }, createdAt: { lt: new Date('2026-11-11T10:00:00Z') } },
        });
        expect(result).toEqual({ claimed: 0, sent: 0, skipped: 0, failed: 0, expired: 3, pruned: 4 });
        expect(sendPushToMany).not.toHaveBeenCalled();
    });

    it('claims due rows atomically and sends only what is still relevant', async () => {
        prismaMock.taskAlert.findMany
            .mockResolvedValueOnce([{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }, { id: 'a4' }, { id: 'a5' }] as never)
            .mockResolvedValueOnce([
                { id: 'a1', taskId: 't1', userId: 'u1' },
                { id: 'a2', taskId: 't1', userId: 'u2' },
                { id: 'a3', taskId: 'closed', userId: 'u1' },
                { id: 'a4', taskId: 't1', userId: 'lapsed' },
                { id: 'a5', taskId: 't1', userId: 'unknown-plan' },
            ] as never);
        prismaMock.task.findMany.mockResolvedValue([{ id: 't1', title: 'Почистить ковёр', category: 'Уборка' }] as never);
        prismaMock.user.findMany.mockResolvedValue([
            provider('u1', 'pro'), provider('u2', 'pro', 'tj'), provider('unknown-plan', 'gold'),
        ] as never);

        const result = await drainTaskAlerts(NOW);

        // Claim: only rows still PENDING, under one claim id, read back by it
        const claimCall = prismaMock.taskAlert.updateMany.mock.calls[1][0]!;
        expect(claimCall.where).toEqual({ id: { in: ['a1', 'a2', 'a3', 'a4', 'a5'] }, status: 'PENDING' });
        expect(claimCall.data).toMatchObject({ status: 'CLAIMED' });
        const claimId = (claimCall.data as { claimId: string }).claimId;
        expect(prismaMock.taskAlert.findMany.mock.calls[1][0]).toMatchObject({ where: { claimId } });

        expect(prismaMock.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: { in: ['t1', 'closed'] }, status: 'OPEN' },
        }));
        expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ taskAlertsEnabled: true, subscription: { is: { isActive: true, endDate: { gt: NOW } } } }),
        }));

        expect(sendPushToMany).toHaveBeenCalledTimes(1);
        expect((sendPushToMany as jest.Mock).mock.calls[0][0].map((m: { userId: string }) => m.userId)).toEqual(['u1', 'u2']);

        expect(prismaMock.taskAlert.updateMany).toHaveBeenCalledWith({
            where: { id: { in: ['a1', 'a2'] } }, data: { status: 'SENT', sentAt: NOW },
        });
        expect(prismaMock.taskAlert.updateMany).toHaveBeenCalledWith({
            where: { id: { in: ['a3', 'a4', 'a5'] } }, data: { status: 'DROPPED' },
        });
        expect(result).toMatchObject({ claimed: 5, sent: 2, skipped: 3, failed: 0 });
    });

    it('sends nothing when another run claimed the rows first', async () => {
        prismaMock.taskAlert.findMany
            .mockResolvedValueOnce([{ id: 'a1' }] as never)
            .mockResolvedValueOnce([]);

        const result = await drainTaskAlerts(NOW);

        expect(prismaMock.task.findMany).not.toHaveBeenCalled();
        expect(sendPushToMany).not.toHaveBeenCalled();
        expect(result).toMatchObject({ claimed: 0, sent: 0 });
    });

    it('leaves a failed delivery claimed rather than retrying it', async () => {
        prismaMock.taskAlert.findMany
            .mockResolvedValueOnce([{ id: 'a1' }, { id: 'a2' }] as never)
            .mockResolvedValueOnce([
                { id: 'a1', taskId: 't1', userId: 'u1' },
                { id: 'a2', taskId: 't2', userId: 'u1' },
            ] as never);
        prismaMock.task.findMany.mockResolvedValue([
            { id: 't1', title: 'A', category: 'Уборка' },
            { id: 't2', title: 'B', category: 'Ремонт' },
        ] as never);
        prismaMock.user.findMany.mockResolvedValue([provider('u1', 'pro')] as never);
        prismaMock.notification.createMany
            .mockRejectedValueOnce(new Error('insert failed'))
            .mockRejectedValueOnce('weird');

        const result = await drainTaskAlerts(NOW);

        expect(result).toMatchObject({ claimed: 2, sent: 0, skipped: 0, failed: 2 });
        expect(logger.error).toHaveBeenCalledWith('Task alert delivery failed', { taskId: 't1', error: 'insert failed' });
        expect(logger.error).toHaveBeenCalledWith('Task alert delivery failed', { taskId: 't2', error: 'weird' });
        // Only the expiry update and the claim: nothing marked SENT or DROPPED
        expect(prismaMock.taskAlert.updateMany).toHaveBeenCalledTimes(2);
    });

    it('uses the current time by default', async () => {
        prismaMock.taskAlert.findMany.mockResolvedValue([]);
        await expect(drainTaskAlerts()).resolves.toMatchObject({ claimed: 0 });
    });
});
