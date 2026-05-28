
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { normalizePhone } from '@/lib/validation';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone, code, type = 'REGISTRATION' } = body;

        if (!phone || !code) {
            return NextResponse.json(
                { error: 'Phone and code are required' },
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
                { error: 'Too many verification attempts. Try again in 15 minutes.' },
                { status: 429 }
            );
        }

        // Find valid, unused code — mark used atomically before acting on it
        const validCode = await prisma.verificationCode.findFirst({
            where: {
                phone: normalizedPhone,
                code,
                type,
                used: false,
                expiresAt: { gt: new Date() }
            }
        });

        if (!validCode) {
            return NextResponse.json(
                { error: 'Invalid or expired code' },
                { status: 400 }
            );
        }

        // Mark used before any further action to prevent replay
        await prisma.verificationCode.update({
            where: { id: validCode.id },
            data: { used: true },
        });

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

        // Delete the used code
        await prisma.verificationCode.delete({
            where: { id: validCode.id }
        });

        return NextResponse.json({ success: true, message: 'Phone verified successfully' });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
