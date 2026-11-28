import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAction, getRequestIP } from '@/lib/audit';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { isValidPhone, normalizePhone } from '@/lib/validation';
import { consumeOtp } from '@/lib/otp';
import { findSmsLoginUser } from '@/lib/sms-login';
import { signedInResponse } from '@/lib/signed-in-response';

/**
 * Sign in with a phone number and the SMS code that
 * POST /api/auth/verify-send (type LOGIN) sent to it. No password.
 * The path stays under /api/auth/login so the mobile client treats a 401 here
 * as a refusal, not an expired session.
 */
export async function POST(request: Request) {
    try {
        const rateLimit = await checkRateLimit(getClientIP(request), 'auth');
        if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

        const { phone, code } = await request.json();
        if (!phone || !code) {
            return NextResponse.json({ error: 'Укажите номер телефона и код' }, { status: 400 });
        }
        if (!isValidPhone(String(phone))) {
            return NextResponse.json(
                { error: 'Неверный формат номера. Используйте +992XXXXXXXXX' },
                { status: 400 }
            );
        }
        const normalizedPhone = normalizePhone(String(phone));

        // Caps code guessing per number, across IPs
        const phoneLimit = await checkRateLimit(`login-otp:${normalizedPhone}`, 'sms');
        if (!phoneLimit.allowed) {
            return NextResponse.json(
                { error: 'Слишком много попыток подтверждения. Попробуйте через 15 минут.' },
                { status: 429 }
            );
        }

        // Before the code, so a number that cannot sign in never spends one
        const { user, verifiesPhone, refusal } = await findSmsLoginUser(normalizedPhone);
        if (!user) return NextResponse.json(refusal, { status: 401 });

        if (!(await consumeOtp(normalizedPhone, String(code), 'LOGIN'))) {
            return NextResponse.json({ error: 'Неверный или просроченный код' }, { status: 400 });
        }

        if (!verifiesPhone) return await signedInResponse(request, user, 'sms');

        const verified = await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } });
        logAction({
            action: 'PHONE_VERIFIED_BY_LOGIN',
            userId: user.id,
            entity: 'User',
            entityId: user.id,
            ipAddress: getRequestIP(request),
        });
        return await signedInResponse(request, verified, 'sms');
    } catch (error) {
        console.error('Code Login Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
