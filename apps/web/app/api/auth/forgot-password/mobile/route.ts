import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetCodeEmail } from '@/lib/notifications/email';
import { logAction, getRequestIP } from '@/lib/audit';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { isValidPhone, normalizePhone, isPlaceholderEmail } from '@/lib/validation';
import { issueOtp, isDesignatedTestPhone } from '@/lib/otp';
import crypto from 'crypto';

// HMAC the OTP code so DB breach doesn't expose valid codes
function hashOtp(userId: string, code: string): string {
    return `mobile:${userId}:` + crypto
        .createHmac('sha256', process.env.JWT_SECRET!)
        .update(code)
        .digest('hex');
}

/**
 * Code-based password reset — used by the mobile app and by the web phone flow.
 *
 * Accepts an email *or* a phone number as `identifier` (older clients send
 * `email`). Phone matters: the mobile signup form collects phone only and the
 * server mints a `@phone.dastiyor.local` placeholder address, so an email-only
 * reset left every phone-registered account permanently unrecoverable while
 * still answering "a code has been sent".
 */
export async function POST(request: Request) {
    const clientIP = getClientIP(request);
    const rateLimit = await checkRateLimit(clientIP, 'auth');
    if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

    // Identical for hit and miss, so no path here enumerates accounts
    const genericOk = () =>
        NextResponse.json({ message: 'If an account exists, a code has been sent.' });
    const smsThrottled = () =>
        NextResponse.json(
            { error: 'Слишком много запросов SMS. Попробуйте через 15 минут.' },
            { status: 429 }
        );

    // Caps SMS spend per number. Must run before the account lookup on the phone
    // path, or a throttled reply would tell an attacker the account exists.
    async function smsAllowed(phone: string): Promise<boolean> {
        if (isDesignatedTestPhone(phone)) return true;
        return (await checkRateLimit(phone, 'sms')).allowed;
    }

    async function sendSmsCode(userId: string, phone: string) {
        await issueOtp(phone, 'RESET_PASSWORD');
        logAction({
            action: 'PASSWORD_RESET_REQUEST',
            userId,
            entity: 'User',
            entityId: userId,
            details: { via: 'sms' },
            ipAddress: getRequestIP(request),
        });
    }

    try {
        const body = await request.json();
        const identifier = String(body.identifier ?? body.email ?? '').trim();

        if (!identifier) {
            return NextResponse.json({ error: 'Укажите email или номер телефона' }, { status: 400 });
        }

        if (isValidPhone(identifier)) {
            const phone = normalizePhone(identifier);
            if (!(await smsAllowed(phone))) return smsThrottled();

            const user = await prisma.user.findFirst({ where: { phone }, select: { id: true } });
            if (user) await sendSmsCode(user.id, phone);

            return genericOk();
        }

        const user = await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
        if (!user) return genericOk();

        // Placeholder address: mail cannot reach it, but the account has a phone
        // by definition. Text the code rather than reporting a send that dies.
        if (isPlaceholderEmail(user.email) && user.phone) {
            if (!(await smsAllowed(user.phone))) return smsThrottled();
            await sendSmsCode(user.id, user.phone);
            return genericOk();
        }

        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.passwordReset.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true },
        });

        await prisma.passwordReset.create({
            data: { token: hashOtp(user.id, code), expiresAt, userId: user.id },
        });

        logAction({
            action: 'PASSWORD_RESET_REQUEST',
            userId: user.id,
            entity: 'User',
            entityId: user.id,
            details: { via: 'email' },
            ipAddress: getRequestIP(request),
        });

        await sendPasswordResetCodeEmail(user.email!, code, user.locale);

        return genericOk();
    } catch (error) {
        console.error('Mobile forgot-password error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
