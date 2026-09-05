import { NextResponse } from 'next/server';
import { persistRequestLocale } from '@/lib/persist-locale';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { validatePassword, isValidPhone, normalizePhone, sanitizeString } from '@/lib/validation';
import { sendWelcomeEmail } from '@/lib/notifications/email';
import { logAction, getRequestIP } from '@/lib/audit';

export async function POST(request: Request) {
    try {
        const clientIP = getClientIP(request);
        const rateLimit = await checkRateLimit(clientIP, 'auth');
        if (!rateLimit.allowed) {
            return rateLimitExceededResponse(rateLimit.resetIn);
        }

        const body = await request.json();
        const { email, password, fullName, phone, role } = body;

        if (!password || !fullName) {
            return NextResponse.json({ error: 'Заполнены не все обязательные поля' }, { status: 400 });
        }

        // Mirror the checks PUT /api/profile already applies to these same
        // fields. Registration skipped them entirely, so an account could be
        // created with an unreachable email -- breaking password reset and every
        // notification -- or a name of unbounded length.
        const trimmedName = String(fullName).trim();
        if (trimmedName.length < 2 || trimmedName.length > 100) {
            return NextResponse.json(
                { error: 'Имя должно содержать от 2 до 100 символов' },
                { status: 400 }
            );
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim().toLowerCase())) {
            return NextResponse.json(
                { error: 'Неверный формат email' },
                { status: 400 }
            );
        }

        // Need at least one contact: phone (mobile flow) or email (web flow)
        if (!phone && !email) {
            return NextResponse.json(
                { error: 'Укажите номер телефона или email' },
                { status: 400 }
            );
        }

        if (phone && !isValidPhone(String(phone))) {
            return NextResponse.json(
                { error: 'Неверный формат номера телефона. Используйте формат +992XXXXXXXXX' },
                { status: 400 }
            );
        }

        const passwordValidation = validatePassword(String(password));
        if (!passwordValidation.valid) {
            return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
        }

        const normalizedPhone = phone ? normalizePhone(String(phone)) : null;

        // Generate placeholder email for phone-only registrations
        const resolvedEmail = email
            ? String(email).trim().toLowerCase()
            : `phone_${normalizedPhone!.replace(/\+/g, '')}@phone.dastiyor.local`;

        // Duplicate checks
        if (email) {
            const byEmail = await prisma.user.findUnique({ where: { email: resolvedEmail } });
            if (byEmail) {
                return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 });
            }
        }
        if (normalizedPhone) {
            const byPhone = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
            if (byPhone) {
                return NextResponse.json({ error: 'Пользователь с таким номером телефона уже существует' }, { status: 400 });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email: resolvedEmail,
                password: hashedPassword,
                fullName: sanitizeString(trimmedName),
                phone: normalizedPhone,
                role: String(role ?? '').toLowerCase() === 'provider' ? 'PROVIDER' : 'CUSTOMER',
            },
        });

        const token = await signJWT({ id: user.id, email: user.email, role: user.role, tv: 0 });

        const response = NextResponse.json(
            {
                message: 'User created successfully',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    phone: user.phone,
                },
            },
            { status: 201 }
        );

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 86400,
            path: '/',
        });

        // Before the welcome email: a language picked on the way in lives in a
        // cookie, not on the brand-new account, which would otherwise be greeted
        // in the default language.
        const locale = await persistRequestLocale(request, user.id, user.locale)
            .catch(err => { console.error('Locale persist error:', err); return user.locale; });

        // Only send welcome email if a real email address was given
        if (email) {
            sendWelcomeEmail(resolvedEmail, user.fullName, user.role, locale)
                .catch(err => console.error('Welcome email error:', err));
        }

        logAction({
            action: 'REGISTER',
            userId: user.id,
            entity: 'User',
            entityId: user.id,
            details: { role: user.role, hasEmail: !!email, hasPhone: !!phone },
            ipAddress: clientIP,
        });

        return response;

    } catch (error) {
        console.error('Registration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
