
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

        // One designated number gets a fixed code and no SMS. App Store and Play
        // reviewers cannot receive a Tajik SMS, so store review needs this either
        // way; it also unblocks QA while SMS credits are pending.
        //
        // This does NOT weaken verification: /api/auth/verify-phone still requires
        // the stored code, unexpired and unused, and still refuses a number owned
        // by another account. All this changes is where the code comes from and
        // that no SMS is sent, for one number. Inert unless BOTH env vars are set.
        // Point SMS_TEST_PHONE at a number the team controls, never a real user's,
        // and unset both once SMS delivery is proven.
        const testPhone = process.env.SMS_TEST_PHONE;
        const testCode = process.env.SMS_TEST_CODE;
        const isTestPhone =
            Boolean(testPhone) && Boolean(testCode) &&
            normalizedPhone === normalizePhone(testPhone as string);

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

        // Generate 6-digit code
        const code = isTestPhone ? (testCode as string) : crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete existing codes for this phone/type to prevent clutter
        await prisma.verificationCode.deleteMany({
            where: { phone: normalizedPhone, type }
        });

        await prisma.verificationCode.create({
            data: { phone: normalizedPhone, code, type, expiresAt }
        });

        // Send SMS -- skipped for the test number, whose code is already known.
        if (!isTestPhone) {
            const sent = await sendVerificationCode(normalizedPhone, code);

            if (!sent) {
                return NextResponse.json(
                    { error: 'Не удалось отправить SMS' },
                    { status: 500 }
                );
            }
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
