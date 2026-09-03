import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logAction, getRequestIP } from '@/lib/audit';
import { requireAuth } from '@/lib/require-auth';
import { sanitizeString } from '@/lib/validation';
import { isSafeAvatarUrl } from '@/lib/avatar-url';

// GET - Get current user profile
export async function GET(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.id as string },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                bio: true,
                skills: true,
                avatar: true,
                role: true,
                createdAt: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }

        return NextResponse.json({ user });

    } catch (error) {
        console.error('Get Profile Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT - Update user profile
export async function PUT(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { fullName, phone, bio, skills, avatar, email, currentPassword } = body;

        if (!fullName || fullName.trim().length < 2) {
            return NextResponse.json({ error: 'Имя должно содержать минимум 2 символа' }, { status: 400 });
        }
        if (fullName.trim().length > 100) {
            return NextResponse.json({ error: 'Имя не должно превышать 100 символов' }, { status: 400 });
        }
        if (bio && bio.length > 500) {
            return NextResponse.json({ error: 'Описание не должно превышать 500 символов' }, { status: 400 });
        }
        if (skills && skills.length > 300) {
            return NextResponse.json({ error: 'Навыки не должны превышать 300 символов' }, { status: 400 });
        }

        let newEmail: string | undefined;
        if (email !== undefined) {
            const trimmed = email.trim().toLowerCase();
            if (trimmed === '') {
                return NextResponse.json({ error: 'Введите корректный email' }, { status: 400 });
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                return NextResponse.json({ error: 'Введите корректный email' }, { status: 400 });
            }

            // Email change requires password confirmation to prevent account takeover
            if (!currentPassword) {
                return NextResponse.json({ error: 'Введите текущий пароль, чтобы подтвердить смену email' }, { status: 400 });
            }
            const userForPwCheck = await prisma.user.findUnique({
                where: { id: payload.id as string },
                select: { password: true },
            });
            if (!userForPwCheck?.password) {
                return NextResponse.json({ error: 'Этот аккаунт использует вход через соцсети — email так изменить нельзя' }, { status: 400 });
            }
            const pwValid = await bcrypt.compare(currentPassword, userForPwCheck.password);
            if (!pwValid) {
                return NextResponse.json({ error: 'Текущий пароль неверен' }, { status: 400 });
            }

            const existing = await prisma.user.findUnique({ where: { email: trimmed }, select: { id: true } });
            if (existing && existing.id !== payload.id) {
                return NextResponse.json({ error: 'Этот email уже используется' }, { status: 409 });
            }
            newEmail = trimmed;
        }

        // Avatar must live on storage we control -- an arbitrary https host would
        // be fetched by everyone who views this profile.
        let safeAvatar: string | null = null;
        if (avatar) {
            if (!isSafeAvatarUrl(avatar)) {
                return NextResponse.json({ error: 'Некорректная ссылка на фото профиля' }, { status: 400 });
            }
            safeAvatar = avatar;
        }

        const updatedUser = await prisma.user.update({
            where: { id: payload.id as string },
            data: {
                fullName: sanitizeString(fullName.trim()),
                // Only touch a field the client actually sent. Omitting one used
                // to null it: a partial update that left out `phone` wiped the
                // number, and since phone-registered users log in with it, that
                // locked them out of their own account for good. Send an explicit
                // empty string to clear a field on purpose.
                ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
                ...(bio !== undefined ? { bio: bio ? sanitizeString(bio.trim()) : null } : {}),
                ...(skills !== undefined ? { skills: skills ? sanitizeString(skills.trim()) : null } : {}),
                ...(avatar !== undefined ? { avatar: safeAvatar } : {}),
                ...(newEmail !== undefined ? { email: newEmail } : {}),
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                bio: true,
                skills: true,
                avatar: true,
                role: true
            }
        });

        logAction({
            action: 'UPDATE_PROFILE',
            userId: payload.id as string,
            entity: 'User',
            entityId: payload.id as string,
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Update Profile Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
