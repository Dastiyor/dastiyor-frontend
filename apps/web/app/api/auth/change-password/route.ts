import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyJWT, getBearerToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logAction, getRequestIP } from '@/lib/audit';
import { validatePassword } from '@/lib/validation';

export async function POST(request: Request) {
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

        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const pwCheck = validatePassword(newPassword);
        if (!pwCheck.valid) {
            return NextResponse.json({ error: pwCheck.error }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: payload.id as string } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.password) {
            return NextResponse.json({ error: 'This account uses Google or Apple sign in and has no password' }, { status: 400 });
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        // Increment tokenVersion to invalidate all existing sessions (forces re-login on other devices)
        await prisma.user.update({
            where: { id: payload.id as string },
            data: { password: hashed, tokenVersion: { increment: 1 } },
        });

        logAction({
            action: 'CHANGE_PASSWORD',
            userId: payload.id as string,
            entity: 'User',
            entityId: payload.id as string,
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change Password Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
