import { NextResponse } from 'next/server';
import { parseSearchParams, searchProfessionals } from '@/lib/professionals';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';

/** GET - public provider search: ?q&category&city&sort=rating|reviews|completed|newest&page&limit */
export async function GET(request: Request) {
    try {
        const rateLimit = await checkRateLimit(getClientIP(request), 'api');
        if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

        const params = parseSearchParams(new URL(request.url).searchParams);
        return NextResponse.json(await searchProfessionals(params));
    } catch (error) {
        console.error('Professionals Search Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
