
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';

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

        // Rate limit by IP
        const clientIP = getClientIP(request);
        const ipLimit = checkRateLimit(clientIP, 'auth');
        if (!ipLimit.allowed) return rateLimitExceededResponse(ipLimit.resetIn);

        // Rate limit by phone to prevent parallel brute-force across IPs
        const phoneLimit = checkRateLimit(`otp:${phone}`, 'sms');
        if (!phoneLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many verification attempts. Try again in 15 minutes.' },
                { status: 429 }
            );
        }

        // Find valid code
        const validCode = await prisma.verificationCode.findFirst({
            where: {
                phone,
                code,
                type,
                expiresAt: {
                    gt: new Date()
                }
            }
        });

        if (!validCode) {
            return NextResponse.json(
                { error: 'Invalid or expired code' },
                { status: 400 }
            );
        }

        // Mark phone as verified if user exists
        // Note: For registration, the user might not exist yet, so we just return success
        // and let the client proceed to registration with the verified phone.
        const user = await prisma.user.findFirst({
            where: { phone }
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
