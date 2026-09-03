
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode } from '@/lib/notifications/sms';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { isValidPhone, normalizePhone } from '@/lib/validation';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone, type = 'REGISTRATION' } = body;

        if (!phone) {
            return NextResponse.json(
                { error: 'Укажите номер телефона' },
                { status: 400 }
            );
        }

        if (!isValidPhone(String(phone))) {
            return NextResponse.json(
                { error: 'Неверный формат номера. Используйте +992XXXXXXXXX' },
                { status: 400 }
            );
        }

        const normalizedPhone = normalizePhone(String(phone));

        // 1. IP-based rate limiting
        const clientIP = getClientIP(request);
        const ipLimit = await checkRateLimit(clientIP, 'auth');
        if (!ipLimit.allowed) {
            return rateLimitExceededResponse(ipLimit.resetIn);
        }

        // 2. Phone-based SMS rate limiting
        const phoneLimit = await checkRateLimit(normalizedPhone, 'sms');
        if (!phoneLimit.allowed) {
            return NextResponse.json(
                { error: 'Слишком много запросов SMS. Попробуйте через 15 минут.' },
                { status: 429 }
            );
        }

        // Generate 6-digit code
        const code = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete existing codes for this phone/type to prevent clutter
        await prisma.verificationCode.deleteMany({
            where: { phone: normalizedPhone, type }
        });

        await prisma.verificationCode.create({
            data: { phone: normalizedPhone, code, type, expiresAt }
        });

        // Send SMS
        const sent = await sendVerificationCode(normalizedPhone, code);

        if (!sent) {
            return NextResponse.json(
                { error: 'Не удалось отправить SMS' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'OTP sent successfully' });

    } catch (error) {
        console.error('Send OTP Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
