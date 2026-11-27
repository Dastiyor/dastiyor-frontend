import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { isValidPhone, normalizePhone } from '@/lib/validation';
import { consumeOtp } from '@/lib/otp';

const VERIFY_TYPE = 'PHONE_VERIFY';

/**
 * Authenticated phone verification — used by OAuth registrants to add and verify a
 * phone number so they can post / accept tasks. The OTP is sent via /api/auth/verify-send
 * with type=PHONE_VERIFY. On success the phone is saved on the user and phoneVerified=true.
 */
export async function POST(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientIP = getClientIP(request);
        const ipLimit = await checkRateLimit(clientIP, 'auth');
        if (!ipLimit.allowed) return rateLimitExceededResponse(ipLimit.resetIn);

        const body = await request.json();
        const { phone, code } = body;

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
        const userId = payload.id as string;

        // Guesses are capped per phone as well as per IP, on this flow's own count.
        const codeLimit = await checkRateLimit(`verify-phone-otp:${normalizedPhone}`, 'sms');
        if (!codeLimit.allowed) {
            return NextResponse.json(
                { error: 'Слишком много попыток подтверждения. Попробуйте через 15 минут.' },
                { status: 429 }
            );
        }

        // Phone must not already belong to a different account
        const phoneOwner = await prisma.user.findFirst({
            where: { phone: normalizedPhone, NOT: { id: userId } },
            select: { id: true },
        });
        if (phoneOwner) {
            return NextResponse.json(
                { error: 'Этот номер телефона уже используется другим аккаунтом' },
                { status: 409 }
            );
        }

        if (!(await consumeOtp(normalizedPhone, String(code), VERIFY_TYPE))) {
            return NextResponse.json({ error: 'Неверный или просроченный код' }, { status: 400 });
        }
        await prisma.user.update({
            where: { id: userId },
            data: { phone: normalizedPhone, phoneVerified: true },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Verify Phone Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
