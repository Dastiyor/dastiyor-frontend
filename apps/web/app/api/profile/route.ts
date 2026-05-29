import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logAction, getRequestIP } from '@/lib/audit';
import { requireAuth } from '@/lib/require-auth';
import { sanitizeString } from '@/lib/validation';

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
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
            return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
        }
        if (fullName.trim().length > 100) {
            return NextResponse.json({ error: 'Name must not exceed 100 characters' }, { status: 400 });
        }
        if (bio && bio.length > 500) {
            return NextResponse.json({ error: 'Bio must not exceed 500 characters' }, { status: 400 });
        }
        if (skills && skills.length > 300) {
            return NextResponse.json({ error: 'Skills must not exceed 300 characters' }, { status: 400 });
        }

        let newEmail: string | undefined;
        if (email !== undefined) {
            const trimmed = email.trim().toLowerCase();
            if (trimmed === '') {
                return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
            }

            // Email change requires password confirmation to prevent account takeover
            if (!currentPassword) {
                return NextResponse.json({ error: 'Enter your current password to confirm email change' }, { status: 400 });
            }
            const userForPwCheck = await prisma.user.findUnique({
                where: { id: payload.id as string },
                select: { password: true },
            });
            if (!userForPwCheck?.password) {
                return NextResponse.json({ error: 'This account uses social sign-in and cannot change email this way' }, { status: 400 });
            }
            const pwValid = await bcrypt.compare(currentPassword, userForPwCheck.password);
            if (!pwValid) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
            }

            const existing = await prisma.user.findUnique({ where: { email: trimmed }, select: { id: true } });
            if (existing && existing.id !== payload.id) {
                return NextResponse.json({ error: 'This email is already in use' }, { status: 409 });
            }
            newEmail = trimmed;
        }

        // Validate avatar is a safe https URL from Vercel Blob or known CDN
        let safeAvatar: string | null = null;
        if (avatar) {
            if (typeof avatar !== 'string' || !avatar.startsWith('https://')) {
                return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
            }
            safeAvatar = avatar;
        }

        const updatedUser = await prisma.user.update({
            where: { id: payload.id as string },
            data: {
                fullName: sanitizeString(fullName.trim()),
                phone: phone?.trim() || null,
                bio: bio ? sanitizeString(bio.trim()) : null,
                skills: skills ? sanitizeString(skills.trim()) : null,
                avatar: safeAvatar,
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
