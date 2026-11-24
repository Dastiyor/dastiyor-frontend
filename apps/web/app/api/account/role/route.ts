import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { signJWT, SESSION_MAX_AGE } from '@/lib/auth';
import { logAction, getRequestIP } from '@/lib/audit';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { getRoleSwitchPreview, switchRole } from '@/lib/role-switch';

// GET - What switching to the other role would do, and whether it is allowed now.
export async function GET(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const preview = await getRoleSwitchPreview(payload.id as string);
        if (!preview) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }
        return NextResponse.json(preview);
    } catch (error) {
        console.error('Role preview error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST { role: 'CUSTOMER' | 'PROVIDER' } - Switch the account's role.
// The role is inside the session token (the header and task page read it), so a
// new token is issued: set as the cookie for web, returned in the body for mobile.
export async function POST(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rate = await checkRateLimit(getClientIP(request), 'auth');
        if (!rate.allowed) return rateLimitExceededResponse(rate.resetIn);

        const userId = payload.id as string;
        const body = await request.json().catch(() => ({}));
        const from = payload.role;
        const result = await switchRole(userId, (body as { role?: unknown }).role);
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, fullName: true, role: true, tokenVersion: true },
        });
        if (!user) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }

        const token = await signJWT({ id: user.id, email: user.email, role: user.role, tv: user.tokenVersion });

        logAction({
            action: 'SWITCH_ROLE',
            userId,
            entity: 'User',
            entityId: userId,
            details: {
                from: typeof from === 'string' ? from : null,
                to: result.role,
                cancelledTasks: result.cancelledTasks,
                withdrawnResponses: result.withdrawnResponses,
            },
            ipAddress: getRequestIP(request),
        });

        const response = NextResponse.json({
            token,
            user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
            cancelledTasks: result.cancelledTasks,
            withdrawnResponses: result.withdrawnResponses,
        });
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: SESSION_MAX_AGE,
            path: '/',
        });
        return response;
    } catch (error) {
        console.error('Role switch error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
