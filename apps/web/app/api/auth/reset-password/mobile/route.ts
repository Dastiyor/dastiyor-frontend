import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validatePassword, isValidPhone, normalizePhone } from '@/lib/validation';
import { logAction, getRequestIP } from '@/lib/audit';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { consumeOtp } from '@/lib/otp';

function hashOtp(userId: string, code: string): string {
    return `mobile:${userId}:` + crypto
        .createHmac('sha256', process.env.JWT_SECRET!)
        .update(code)
        .digest('hex');
}

const INVALID_CODE = { error: 'Неверный или просроченный код. Запросите новый.' };

/**
 * Completes the code-based reset started by forgot-password/mobile. `identifier`
 * is whatever the user asked for the code with — a phone number (SMS code) or an
 * email (emailed code). Older clients send `email`.
 */
export async function POST(request: Request) {
    const clientIP = getClientIP(request);
    const rateLimit = await checkRateLimit(clientIP, 'auth');
    if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

    try {
        const body = await request.json();
        const { code, password } = body;
        const identifier = String(body.identifier ?? body.email ?? '').trim();

        if (!identifier || !code || !password) {
            return NextResponse.json({ error: 'Укажите email или телефон, код и пароль' }, { status: 400 });
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
        }

        const byPhone = isValidPhone(identifier);
        const phone = byPhone ? normalizePhone(identifier) : null;

        // Cap code guessing per number/account, not just per IP
        const attemptLimit = await checkRateLimit(
            `reset:${phone ?? identifier.toLowerCase()}`,
            'sms'
        );
        if (!attemptLimit.allowed) {
            return NextResponse.json(
                { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
                { status: 429 }
            );
        }

        const user = phone
            ? await prisma.user.findFirst({ where: { phone } })
            : await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });

        if (!user) {
            return NextResponse.json(INVALID_CODE, { status: 400 });
        }

        // Phone codes live in VerificationCode (same store the phone-verification
        // flow uses); emailed codes live in PasswordReset. Burn whichever applies
        // before touching the password.
        let resetTokenId: string | null = null;
        if (phone) {
            const ok = await consumeOtp(phone, String(code), 'RESET_PASSWORD');
            if (!ok) return NextResponse.json(INVALID_CODE, { status: 400 });
        } else {
            const resetToken = await prisma.passwordReset.findFirst({
                where: {
                    token: hashOtp(user.id, code),
                    userId: user.id,
                    used: false,
                    expiresAt: { gt: new Date() },
                },
            });
            if (!resetToken) return NextResponse.json(INVALID_CODE, { status: 400 });
            resetTokenId = resetToken.id;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Increment tokenVersion to invalidate all existing sessions after password reset
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword, tokenVersion: { increment: 1 } },
            }),
            ...(resetTokenId
                ? [prisma.passwordReset.update({ where: { id: resetTokenId }, data: { used: true } })]
                : []),
        ]);

        logAction({
            action: 'PASSWORD_RESET',
            userId: user.id,
            entity: 'User',
            entityId: user.id,
            details: { via: phone ? 'sms' : 'email' },
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({ message: 'Password reset successfully.' });
    } catch (error) {
        console.error('Mobile reset-password error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
