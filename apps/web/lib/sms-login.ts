import { prisma } from '@/lib/prisma';

/**
 * Who a phone number may sign in as with an SMS code.
 *
 * An account that has *proved* the number comes first, the oldest one, so
 * sending the code and checking it always agree.
 *
 * Without one, a number held by exactly one account signs into it, and the
 * correct code verifies the number (`verifiesPhone`). These are older accounts,
 * saved before a phone needed an SMS code; resetting the password by SMS already
 * gave whoever holds the number the same access. Several unverified accounts on
 * one number are refused rather than guessed between, and an admin account is
 * never opened this way.
 */
export async function findSmsLoginUser(phone: string) {
    const verified = await prisma.user.findFirst({
        where: { phone, phoneVerified: true },
        orderBy: { createdAt: 'asc' },
    });
    if (verified) return { user: verified, verifiesPhone: false, refusal: null };

    const matches = await prisma.user.findMany({ where: { phone }, take: 2 });
    if (matches.length === 1 && matches[0].role !== 'ADMIN') {
        return { user: matches[0], verifiesPhone: true, refusal: null };
    }

    return {
        user: null,
        verifiesPhone: false,
        refusal: matches.length > 0
            ? { error: 'Этот номер не подтверждён. Войдите по паролю.', code: 'PASSWORD_REQUIRED' }
            : { error: 'Этот номер не зарегистрирован', code: 'ACCOUNT_NOT_FOUND' },
    };
}
