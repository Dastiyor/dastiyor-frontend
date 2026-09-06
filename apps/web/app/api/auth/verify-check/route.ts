
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { normalizePhone } from '@/lib/validation';
import { consumeOtp } from '@/lib/otp';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone, code, type = 'REGISTRATION' } = body;

        if (!phone || !code) {
            return NextResponse.json(
                { error: 'Укажите номер телефона и код' },
                { status: 400 }
            );
        }

        const normalizedPhone = normalizePhone(String(phone));

        // Rate limit by IP
        const clientIP = getClientIP(request);
        const ipLimit = await checkRateLimit(clientIP, 'auth');
        if (!ipLimit.allowed) return rateLimitExceededResponse(ipLimit.resetIn);

        // Rate limit by normalized phone to prevent parallel brute-force across IPs
        const phoneLimit = await checkRateLimit(`otp:${normalizedPhone}`, 'sms');
        if (!phoneLimit.allowed) {
            return NextResponse.json(
                { error: 'Слишком много попыток подтверждения. Попробуйте через 15 минут.' },
                { status: 429 }
            );
        }

        // Marks the code used before we act on it, so it cannot be replayed
        const ok = await consumeOtp(normalizedPhone, String(code), type);
        if (!ok) {
            return NextResponse.json(
                { error: 'Неверный или просроченный код' },
                { status: 400 }
            );
        }

        // Mark phone as verified if user exists
        const user = await prisma.user.findFirst({
            where: { phone: normalizedPhone }
        });

        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: { isVerified: true }
            });
        }

        return NextResponse.json({ success: true, message: 'Phone verified successfully' });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
