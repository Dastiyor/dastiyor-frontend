import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { isValidPhone, normalizePhone } from '@/lib/validation';
import { issueOtp, isDesignatedTestPhone } from '@/lib/otp';

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
        const isTestPhone = isDesignatedTestPhone(normalizedPhone);

        // 1. IP-based rate limiting
        const clientIP = getClientIP(request);
        const ipLimit = await checkRateLimit(clientIP, 'auth');
        if (!ipLimit.allowed) {
            return rateLimitExceededResponse(ipLimit.resetIn);
        }

        // 2. Phone-based SMS rate limiting. The test number sends no SMS, and this
        // limit exists to cap SMS spend, so applying it there only blocks retesting.
        if (!isTestPhone) {
            const phoneLimit = await checkRateLimit(normalizedPhone, 'sms');
            if (!phoneLimit.allowed) {
                return NextResponse.json(
                    { error: 'Слишком много запросов SMS. Попробуйте через 15 минут.' },
                    { status: 429 }
                );
            }
        }

        const sent = await issueOtp(normalizedPhone, type);
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
