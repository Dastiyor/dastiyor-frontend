import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT, getBearerToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logAction, getRequestIP } from '@/lib/audit';

// GET - Get current user profile
export async function GET(request: Request) {
    try {
        const bearerToken = getBearerToken(request);
        let token: string | undefined = bearerToken ?? undefined;
        if (!token) {
            const cookieStore = await cookies();
            token = cookieStore.get('token')?.value;
        }
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyJWT(token);
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
        const bearerToken = getBearerToken(request);
        let token: string | undefined = bearerToken ?? undefined;
        if (!token) {
            const cookieStore = await cookies();
            token = cookieStore.get('token')?.value;
        }
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { fullName, phone, bio, skills, avatar } = body;

        if (!fullName || fullName.trim().length < 2) {
            return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: payload.id as string },
            data: {
                fullName: fullName.trim(),
                phone: phone?.trim() || null,
                bio: bio?.trim() || null,
                skills: skills?.trim() || null,
                avatar: avatar || null
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
