import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { asLocale } from '@/lib/notifications/strings';

/**
 * Store the caller's interface language.
 *
 * Notifications are triggered by someone else's action, so the recipient's
 * language cannot be read off the request that causes them -- it has to be
 * persisted. Kept separate from PUT /api/profile, which requires a full name
 * and is the wrong shape for a single background preference write.
 */
export async function PUT(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const locale = asLocale(typeof body?.locale === 'string' ? body.locale : null);

        await prisma.user.update({
            where: { id: payload.id as string },
            data: { locale },
        });

        return NextResponse.json({ locale });
    } catch (error) {
        console.error('Set Locale Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
