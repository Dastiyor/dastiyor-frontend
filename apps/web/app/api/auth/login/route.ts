import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { logAction, getRequestIP } from '@/lib/audit';
import { normalizePhone } from '@/lib/validation';

export async function POST(request: Request) {
    try {
        // Rate limiting
        const clientIP = getClientIP(request);
        const rateLimit = await checkRateLimit(clientIP, 'auth');

        if (!rateLimit.allowed) {
            return rateLimitExceededResponse(rateLimit.resetIn);
        }

        const body = await request.json();
        // Accept `identifier` (phone or email) or legacy `email` field
        const identifier: string = (body.identifier || body.email || '').trim();
        const { password } = body;

        if (!identifier || !password) {
            return NextResponse.json(
                { error: 'Email/phone and password are required' },
                { status: 400 }
            );
        }

        // Detect if identifier is a phone number
        const looksLikePhone = /^\+?[0-9]{9,15}$/.test(identifier.replace(/[\s\-()]/g, ''));

        let user;
        if (looksLikePhone) {
            const normalized = normalizePhone(identifier);
            user = await prisma.user.findFirst({ where: { phone: normalized } });
        } else {
            user = await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
        }

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        if (!user.password) {
            const provider = user.googleId ? 'Google' : user.appleId ? 'Apple' : 'OAuth';
            return NextResponse.json(
                { error: `Этот аккаунт использует вход через ${provider}. Нажмите кнопку ниже.` },
                { status: 401 }
            );
        }

        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const retryAfterSec = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
            return NextResponse.json(
                { error: 'Аккаунт временно заблокирован. Попробуйте позже.', retryAfter: retryAfterSec },
                { status: 429 }
            );
        }

        // Verify Password
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            const attempts = (user.loginAttempts ?? 0) + 1;
            const lockout = attempts >= 5;
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    loginAttempts: attempts,
                    lockedUntil: lockout ? new Date(Date.now() + 15 * 60 * 1000) : null,
                },
            });
            logAction({
                action: 'LOGIN_FAILED',
                details: { identifier, attempts },
                ipAddress: getRequestIP(request),
            });
            return NextResponse.json(
                { error: lockout ? 'Аккаунт заблокирован на 15 минут из-за многократных неудачных попыток.' : 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Reset attempts on successful login
        await prisma.user.update({
            where: { id: user.id },
            data: { loginAttempts: 0, lockedUntil: null },
        });

        // Generate Token (tv = tokenVersion for revocation support)
        const token = await signJWT({
            id: user.id,
            email: user.email,
            role: user.role,
            tv: user.tokenVersion,
        });

        const response = NextResponse.json(
            {
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role
                }
            },
            { status: 200 }
        );

        logAction({
            action: 'LOGIN',
            userId: user.id,
            entity: 'User',
            entityId: user.id,
            ipAddress: getRequestIP(request),
        });

        // Set cookie
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 86400, // 1 day
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
