import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetCodeEmail } from '@/lib/notifications/email';
import { logAction, getRequestIP } from '@/lib/audit';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import crypto from 'crypto';

// HMAC the OTP code so DB breach doesn't expose valid codes
function hashOtp(userId: string, code: string): string {
    return `mobile:${userId}:` + crypto
        .createHmac('sha256', process.env.JWT_SECRET!)
        .update(code)
        .digest('hex');
}

export async function POST(request: Request) {
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP, 'auth');
    if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({ message: 'If an account exists, a code has been sent.' });
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
            ipAddress: getRequestIP(request),
        });

        await sendPasswordResetCodeEmail(user.email!, code);

        return NextResponse.json({ message: 'If an account exists, a code has been sent.' });
    } catch (error) {
        console.error('Mobile forgot-password error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
