
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode } from '@/lib/notifications/sms';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone, type = 'REGISTRATION' } = body;

        if (!phone) {
            return NextResponse.json(
                { error: 'Phone number is required' },
                { status: 400 }
            );
        }

        // 1. IP-based rate limiting
        const clientIP = getClientIP(request);
        const ipLimit = checkRateLimit(clientIP, 'auth');
        if (!ipLimit.allowed) {
            return rateLimitExceededResponse(ipLimit.resetIn);
        }

        // 2. Phone-based SMS rate limiting
        const phoneLimit = checkRateLimit(phone, 'sms');
        if (!phoneLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many SMS requests. Please try again in 15 minutes.' },
                { status: 429 }
            );
        }

        // Generate 6-digit code
        const code = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save to DB
        // Optionally delete existing codes for this phone/type to prevent clutter
        await prisma.verificationCode.deleteMany({
            where: {
                phone,
                type
            }
        });

        await prisma.verificationCode.create({
            data: {
                phone,
                code,
                type,
                expiresAt
            }
        });

        // Send SMS
        const sent = await sendVerificationCode(phone, code);

        if (!sent) {
            return NextResponse.json(
                { error: 'Failed to send SMS' },
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
