import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { validatePassword } from '@/lib/validation';
import { logAction, getRequestIP } from '@/lib/audit';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP, 'auth');
    if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

    try {
        const body = await request.json();
        const { email, code, password } = body;

        if (!email || !code || !password) {
            return NextResponse.json({ error: 'Email, code, and password are required' }, { status: 400 });
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 });
        }

        const tokenValue = `mobile:${user.id}:${code}`;
        const resetToken = await prisma.passwordReset.findFirst({
            where: {
                token: tokenValue,
                userId: user.id,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });

        if (!resetToken) {
            return NextResponse.json({ error: 'Invalid or expired code. Request a new one.' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await prisma.$transaction([
            prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } }),
            prisma.passwordReset.update({ where: { id: resetToken.id }, data: { used: true } }),
        ]);

        logAction({
            action: 'PASSWORD_RESET',
            userId: user.id,
            entity: 'User',
            entityId: user.id,
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({ message: 'Password reset successfully.' });
    } catch (error) {
        console.error('Mobile reset-password error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
