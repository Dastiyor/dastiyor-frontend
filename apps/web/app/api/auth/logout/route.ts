import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT, getBearerToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const bearerToken = getBearerToken(request);
        let token: string | undefined = bearerToken ?? undefined;
        if (!token) {
            const cookieStore = await cookies();
            token = cookieStore.get('token')?.value;
        }

        if (token) {
            const payload = await verifyJWT(token);
            if (payload?.id) {
                // Increment tokenVersion to invalidate all existing tokens for this user
                await prisma.user.update({
                    where: { id: payload.id as string },
                    data: { tokenVersion: { increment: 1 } },
                }).catch(() => {}); // Non-blocking — cookie is cleared regardless
            }
        }
    } catch {
        // Continue regardless — cookie must be cleared
    }

    const response = NextResponse.json({ message: 'Logged out' });
    response.cookies.delete('token');
    return response;
}
