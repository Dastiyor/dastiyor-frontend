import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/notifications/email';
import { logAction, getRequestIP } from '@/lib/audit';

function getResetLinkBase(request: Request): string {
    const url = process.env.NEXT_PUBLIC_APP_URL;
    if (url) return url.replace(/\/$/, '');
    try {
        const u = new URL(request.url);
        if (u.origin && u.origin !== 'null') return u.origin;
    } catch (_) {}
    return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
}

// POST - Request password reset
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({
                message: 'If an account exists with this email, a password reset link has been sent.'
            });
        }

        // Generate reset token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Invalidate any existing tokens for this user
        await prisma.passwordReset.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true }
        });

        // Create new reset token
        await prisma.passwordReset.create({
            data: {
                token,
                expiresAt,
                userId: user.id
            }
        });

        logAction({
            action: 'PASSWORD_RESET_REQUEST',
            userId: user.id,
            entity: 'User',
            entityId: user.id,
            ipAddress: getRequestIP(request),
        });

        const baseUrl = getResetLinkBase(request);
        const resetLink = `${baseUrl}/reset-password?token=${token}`;
        const sent = await sendPasswordResetEmail(user.email, resetLink);

        if (!sent && process.env.NODE_ENV === 'development') {
            console.log('='.repeat(60));
            console.log('PASSWORD RESET LINK (Email not sent, fallback):');
            console.log(resetLink);
            console.log('='.repeat(60));
        }

        return NextResponse.json({
            message: 'If an account exists with this email, a password reset link has been sent.',
            ...(process.env.NODE_ENV === 'development' && { debug_token: token })
        });

    } catch (error) {
        console.error('Password Reset Request Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
