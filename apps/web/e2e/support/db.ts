import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'crypto';
import { E2E_EMAIL_DOMAIN, E2E_PASSWORD, E2E_SMS_PHONE, loadE2EEnv } from './env';

loadE2EEnv();

export const prisma = new PrismaClient();

export type E2EUser = {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    password: string;
    role: 'CUSTOMER' | 'PROVIDER';
};

export function e2eEmail(label: string) {
    return `${label}-${randomUUID().slice(0, 8)}${E2E_EMAIL_DOMAIN}`;
}

/** A unique tag for titles and messages, so a test finds its own rows in a shared feed. */
export function e2eTag() {
    return `E2E-${randomUUID().slice(0, 8)}`;
}

/**
 * Creates an account straight in the database, as if it had already signed up
 * and verified its phone. The signup form itself is covered once, in
 * flows/signup.spec.ts; everything else starts from here.
 */
export async function createUser(
    role: E2EUser['role'],
    overrides: { fullName?: string; phoneVerified?: boolean; googleId?: string; appleId?: string } = {},
): Promise<E2EUser> {
    const fullName = overrides.fullName ?? (role === 'PROVIDER' ? 'E2E Исполнитель' : 'E2E Заказчик');
    const email = e2eEmail(role.toLowerCase());
    // Never texted: no flow sends an SMS to these, and 000 is not a real prefix.
    const phone = `+992000${randomInt(100000, 999999)}`;

    const user = await prisma.user.create({
        data: {
            email,
            phone,
            fullName,
            role,
            password: await bcrypt.hash(E2E_PASSWORD, 4),
            phoneVerified: overrides.phoneVerified ?? true,
            googleId: overrides.googleId,
            appleId: overrides.appleId,
            // POST /api/responses asks for an active subscription unless
            // SUBSCRIPTION_GATE_ENABLED=false; give providers one either way.
            ...(role === 'PROVIDER'
                ? { subscription: { create: { plan: 'standard', endDate: new Date(Date.now() + 30 * 864e5) } } }
                : {}),
        },
    });

    return { id: user.id, email, phone, fullName, password: E2E_PASSWORD, role };
}

export async function createTask(owner: E2EUser, overrides: { title?: string; status?: string } = {}) {
    return prisma.task.create({
        data: {
            title: overrides.title ?? `${e2eTag()} Собрать шкаф`,
            description: 'Автоматический тест: задание создано Playwright и будет удалено.',
            category: 'Ремонт',
            city: 'Душанбе',
            budgetType: 'fixed',
            budgetAmount: '150',
            budgetAmountNum: 150,
            status: overrides.status ?? 'OPEN',
            userId: owner.id,
        },
    });
}

/**
 * Deletes every account in the e2e email domain and everything hanging off it.
 * Matching is by that domain only — never by phone or name — so nothing a real
 * person created can be caught by it.
 */
export async function purgeE2EData() {
    const users = await prisma.user.findMany({
        where: { email: { endsWith: E2E_EMAIL_DOMAIN } },
        select: { id: true, phone: true },
    });
    const userIds = users.map(u => u.id);
    const phones = [E2E_SMS_PHONE, ...users.map(u => u.phone).filter((p): p is string => !!p)];

    // Codes are keyed by phone, not user, and only ever for the suite's own numbers.
    await prisma.verificationCode.deleteMany({ where: { phone: { in: phones } } });
    // Failed logins are logged without a userId; the attempted address is in `details`.
    await prisma.actionLog.deleteMany({ where: { userId: null, details: { contains: E2E_EMAIL_DOMAIN } } });
    if (userIds.length === 0) return 0;

    const tasks = await prisma.task.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
    const taskIds = tasks.map(t => t.id);
    const byUser = { in: userIds };
    const byTask = { in: taskIds };

    await prisma.$transaction([
        prisma.message.deleteMany({ where: { OR: [{ senderId: byUser }, { receiverId: byUser }, { taskId: byTask }] } }),
        prisma.review.deleteMany({ where: { OR: [{ reviewerId: byUser }, { reviewedId: byUser }, { taskId: byTask }] } }),
        prisma.response.deleteMany({ where: { OR: [{ userId: byUser }, { taskId: byTask }] } }),
        prisma.taskFavorite.deleteMany({ where: { OR: [{ userId: byUser }, { taskId: byTask }] } }),
        prisma.report.deleteMany({ where: { OR: [{ reporterId: byUser }, { targetUserId: byUser }, { targetTaskId: byTask }] } }),
        prisma.notification.deleteMany({ where: { userId: byUser } }),
        prisma.actionLog.deleteMany({ where: { userId: byUser } }),
        prisma.subscription.deleteMany({ where: { userId: byUser } }),
        prisma.payment.deleteMany({ where: { userId: byUser } }),
        prisma.passwordReset.deleteMany({ where: { userId: byUser } }),
        prisma.task.deleteMany({ where: { id: byTask } }),
        prisma.user.deleteMany({ where: { id: byUser } }),
    ]);
    return userIds.length;
}
