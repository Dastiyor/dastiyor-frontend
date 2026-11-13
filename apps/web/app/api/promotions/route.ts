import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { getCategories } from '@/lib/categories';
import { PROMOTION_ERRORS, getPromotionStatus, startPromotion } from '@/lib/promotions';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit';

/** The signed-in provider and the profile categories that still exist, or an error response. */
async function provider(request: Request) {
    const payload = await requireAuth(request);
    if (!payload?.id) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

    const user = await prisma.user.findUnique({ where: { id: payload.id as string }, select: { id: true, role: true, categories: true } });
    if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    if (user.role !== 'PROVIDER') return { response: NextResponse.json({ error: PROMOTION_ERRORS.providerOnly }, { status: 403 }) };

    const known = await getCategories();
    return { user, known, categories: user.categories.filter(c => known.includes(c)) };
}

/** GET - credits this period, the running promotion and pin, pin availability. */
export async function GET(request: Request) {
    try {
        const p = await provider(request);
        if (p.response) return p.response;
        return NextResponse.json(await getPromotionStatus(p.user.id, { categories: p.categories }));
    } catch (error) {
        console.error('Promotions Status Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/** POST { category? } - start a 24-hour promotion, or with a category a pin (BUSINESS). */
export async function POST(request: Request) {
    try {
        const p = await provider(request);
        if (p.response) return p.response;

        const rateLimit = await checkRateLimit(`promotion:${p.user.id}`, 'responses');
        if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

        const body = await request.json().catch(() => ({}));
        const category = typeof body?.category === 'string' && body.category.trim() ? body.category.trim() : null;
        if (category) {
            if (!p.known.includes(category)) return NextResponse.json({ error: PROMOTION_ERRORS.unknownCategory }, { status: 400 });
            // The directory lists a provider only under their own categories, so a pin elsewhere would never show.
            if (!p.categories.includes(category)) return NextResponse.json({ error: PROMOTION_ERRORS.categoryNotInProfile }, { status: 400 });
        }

        const result = await startPromotion(p.user.id, category);
        if (!result.ok) {
            const { status, error, code, nextFreeAt } = result;
            return NextResponse.json({ error, code, ...(nextFreeAt && { nextFreeAt }) }, { status });
        }

        const status = await getPromotionStatus(p.user.id, { categories: p.categories });
        return NextResponse.json({ promotion: result.promotion, status }, { status: 201 });
    } catch (error) {
        console.error('Promotions Start Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
