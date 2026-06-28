import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { isValidPhone, normalizePhone } from '@/lib/validation';

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

        // Validate the OTP
        const validCode = await prisma.verificationCode.findFirst({
            where: {
                phone: normalizedPhone,
                code: String(code),
                type: VERIFY_TYPE,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });
        if (!validCode) {
            return NextResponse.json({ error: 'Неверный или просроченный код' }, { status: 400 });
        }

        // Consume the code and verify the user's phone
        await prisma.verificationCode.deleteMany({
            where: { phone: normalizedPhone, type: VERIFY_TYPE },
        });
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
