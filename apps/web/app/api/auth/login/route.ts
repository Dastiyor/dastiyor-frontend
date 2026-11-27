import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { logAction, getRequestIP } from '@/lib/audit';
import { normalizePhone } from '@/lib/validation';
import { signedInResponse } from '@/lib/signed-in-response';

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
                { error: 'Укажите email или телефон и пароль' },
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

        // Say plainly that there is no such account, with a code the clients turn
        // into a "create an account" link. Signup already tells anyone whether a
        // number or email is taken, so this reveals nothing new.
        if (!user) {
            return NextResponse.json(
                {
                    error: looksLikePhone ? 'Этот номер не зарегистрирован' : 'Аккаунт с таким email не найден',
                    code: 'ACCOUNT_NOT_FOUND',
                },
                { status: 401 }
            );
        }

        if (!user.password) {
            // Signed up with a phone number and no password.
            if (!user.googleId && !user.appleId) {
                return NextResponse.json(
                    { error: 'Для этого аккаунта пароль не задан. Войдите по коду из SMS.', code: 'PASSWORD_NOT_SET' },
                    { status: 401 }
                );
            }
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
                { error: lockout ? 'Аккаунт заблокирован на 15 минут из-за многократных неудачных попыток.' : 'Неверный пароль' },
                { status: 401 }
            );
        }

        return await signedInResponse(request, user, 'password');

    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
