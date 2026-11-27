import { prisma } from '@/lib/prisma';

/**
 * Who a phone number may sign in as with an SMS code.
 *
 * Only an account that has *proved* the number counts. `phone` has no unique
 * index, and the profile form used to save any number without a check, so a
 * code login into an unverified match could hand a stranger's account to
 * whoever holds the SIM. The oldest verified account wins, so sending the code
 * and checking it always agree.
 */
export async function findSmsLoginUser(phone: string) {
    const user = await prisma.user.findFirst({
        where: { phone, phoneVerified: true },
        orderBy: { createdAt: 'asc' },
    });
    if (user) return { user, refusal: null };

    const unverified = await prisma.user.findFirst({ where: { phone }, select: { id: true } });
    return {
        user: null,
        refusal: unverified
            ? { error: 'Этот номер не подтверждён. Войдите по паролю.', code: 'PASSWORD_REQUIRED' }
            : { error: 'Этот номер не зарегистрирован', code: 'ACCOUNT_NOT_FOUND' },
    };
}
