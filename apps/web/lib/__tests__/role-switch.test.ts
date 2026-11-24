/** @jest-environment node */
import { prismaMock } from '../../__tests__/mocks/prisma';
import { getRoleSwitchPreview, switchRole, ROLE_SWITCH_ERRORS } from '../role-switch';
import { sendTaskCancelledNotification } from '@/lib/notifications/email';

jest.mock('@/lib/notifications/email', () => ({ sendTaskCancelledNotification: jest.fn(async () => undefined) }));

const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);
const userFind = prismaMock.user.findUnique as jest.Mock;

function given(role: string, opts: { inProgress?: number; open?: number; pending?: number; sub?: object | null } = {}) {
    userFind.mockResolvedValue({ role, subscription: opts.sub ?? null });
    prismaMock.task.count.mockImplementation((async (args: { where: { status: string } }) =>
        args.where.status === 'IN_PROGRESS' ? opts.inProgress ?? 0 : opts.open ?? 0) as never);
    prismaMock.response.count.mockResolvedValue(opts.pending ?? 0);
    // Interactive transaction: run the callback against the same mock.
    prismaMock.$transaction.mockImplementation((async (fn: (tx: unknown) => unknown) => fn(prismaMock)) as never);
}

describe('getRoleSwitchPreview', () => {
    it('null for a missing user or an admin', async () => {
        userFind.mockResolvedValue(null);
        expect(await getRoleSwitchPreview('u1')).toBeNull();
        userFind.mockResolvedValue({ role: 'ADMIN', subscription: null });
        expect(await getRoleSwitchPreview('u1')).toBeNull();
    });

    it('customer: counts the open tasks that would be cancelled', async () => {
        given('CUSTOMER', { open: 2 });
        expect(await getRoleSwitchPreview('u1')).toEqual({
            role: 'CUSTOMER', target: 'PROVIDER', openTasks: 2, pendingResponses: 0, blocker: null,
        });
        expect(prismaMock.response.count).not.toHaveBeenCalled();
    });

    it('provider: counts pending responses', async () => {
        given('PROVIDER', { pending: 3 });
        expect(await getRoleSwitchPreview('u1')).toMatchObject({ target: 'CUSTOMER', openTasks: 0, pendingResponses: 3, blocker: null });
    });

    it('blocked while a task is in progress, on either side', async () => {
        given('CUSTOMER', { inProgress: 1 });
        expect((await getRoleSwitchPreview('u1'))?.blocker).toBe(ROLE_SWITCH_ERRORS.inProgress);
        expect(prismaMock.task.count).toHaveBeenCalledWith({
            where: { status: 'IN_PROGRESS', OR: [{ userId: 'u1' }, { assignedUserId: 'u1' }] },
        });
    });

    it('provider blocked by a running paid plan, not by an expired or inactive one', async () => {
        given('PROVIDER', { sub: { isActive: true, endDate: future } });
        expect((await getRoleSwitchPreview('u1'))?.blocker).toBe(ROLE_SWITCH_ERRORS.activePlan);
        given('PROVIDER', { sub: { isActive: true, endDate: past } });
        expect((await getRoleSwitchPreview('u1'))?.blocker).toBeNull();
        given('PROVIDER', { sub: { isActive: false, endDate: future } });
        expect((await getRoleSwitchPreview('u1'))?.blocker).toBeNull();
    });
});

describe('switchRole', () => {
    it('rejects a bad target, the same role and a blocked switch', async () => {
        given('CUSTOMER');
        expect(await switchRole('u1', 'ADMIN')).toEqual({ ok: false, status: 400, error: ROLE_SWITCH_ERRORS.invalidRole });
        expect(await switchRole('u1', 'CUSTOMER')).toEqual({ ok: false, status: 400, error: ROLE_SWITCH_ERRORS.sameRole });
        given('CUSTOMER', { inProgress: 1 });
        expect(await switchRole('u1', 'PROVIDER')).toEqual({ ok: false, status: 409, error: ROLE_SWITCH_ERRORS.inProgress });
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('404 for a missing user', async () => {
        userFind.mockResolvedValue(null);
        expect(await switchRole('u1', 'PROVIDER')).toMatchObject({ ok: false, status: 404 });
    });

    it('customer → provider cancels open tasks, rejects their bids and emails the bidders', async () => {
        given('CUSTOMER', { open: 1 });
        prismaMock.task.findMany.mockResolvedValue([
            { id: 't1', title: 'Ремонт', responses: [{ user: { email: 'p@x.tj', locale: 'tj' } }, { user: { email: null, locale: 'ru' } }] },
        ] as never);

        expect(await switchRole('u1', 'PROVIDER')).toEqual({ ok: true, role: 'PROVIDER', cancelledTasks: 1, withdrawnResponses: 0 });
        expect(prismaMock.task.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['t1'] }, status: 'OPEN' }, data: { status: 'CANCELLED' } });
        expect(prismaMock.response.updateMany).toHaveBeenCalledWith({ where: { taskId: { in: ['t1'] }, status: 'PENDING' }, data: { status: 'REJECTED' } });
        expect(prismaMock.response.deleteMany).not.toHaveBeenCalled();
        expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { role: 'PROVIDER' } });
        expect(sendTaskCancelledNotification).toHaveBeenCalledTimes(1);
        expect(sendTaskCancelledNotification).toHaveBeenCalledWith('p@x.tj', 'Ремонт', expect.stringMatching(/\/tasks$/), 'tj');
    });

    it('customer with no open tasks switches without touching tasks', async () => {
        given('CUSTOMER');
        prismaMock.task.findMany.mockResolvedValue([]);
        expect(await switchRole('u1', 'PROVIDER')).toMatchObject({ ok: true, cancelledTasks: 0 });
        expect(prismaMock.task.updateMany).not.toHaveBeenCalled();
    });

    it('provider → customer withdraws pending responses', async () => {
        given('PROVIDER', { pending: 2 });
        prismaMock.response.deleteMany.mockResolvedValue({ count: 2 });
        expect(await switchRole('u1', 'CUSTOMER')).toEqual({ ok: true, role: 'CUSTOMER', cancelledTasks: 0, withdrawnResponses: 2 });
        expect(prismaMock.response.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', status: 'PENDING' } });
        expect(prismaMock.task.findMany).not.toHaveBeenCalled();
        expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { role: 'CUSTOMER' } });
    });
});
