import { prisma } from '@/lib/prisma';

/**
 * The account a password reset by phone acts on. `phone` has no unique index:
 * the account that has proved the number comes first, then the oldest, so this
 * agrees with SMS login (`lib/sms-login.ts`) and a request and its code always
 * reach the same account.
 */
export function findPhoneResetAccount(phone: string) {
    return prisma.user.findFirst({
        where: { phone },
        orderBy: [{ phoneVerified: 'desc' }, { createdAt: 'asc' }],
        select: { id: true },
    });
}
