import { NextResponse } from 'next/server';
import { upsertOAuthUser } from '@/lib/oauth';
import { getClientIP } from '@/lib/rate-limit';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const appleJWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export async function POST(request: Request) {
    try {
        const { identityToken, email, fullName, role } = await request.json();

        if (!identityToken) {
            return NextResponse.json({ error: 'Identity token required' }, { status: 400 });
        }

        const bundleId = process.env.APPLE_BUNDLE_ID;
        if (!bundleId) {
            return NextResponse.json({ error: 'Apple Sign In not configured' }, { status: 503 });
        }

        const { payload } = await jwtVerify(identityToken, appleJWKS, {
            issuer: 'https://appleid.apple.com',
            audience: bundleId,
        });

        const appleUserId = payload.sub as string;
        const appleEmail = (payload.email as string | undefined) || email;

        if (!appleUserId || !appleEmail) {
            return NextResponse.json({ error: 'Incomplete Apple profile' }, { status: 401 });
        }

        const name = fullName || appleEmail.split('@')[0];

        const { user, token } = await upsertOAuthUser({
            provider: 'apple',
            providerId: appleUserId,
            email: appleEmail,
            name,
            role: role || 'customer',
            ipAddress: getClientIP(request),
        });

        return NextResponse.json({
            token,
            user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
        });

    } catch (err) {
        console.error('Apple mobile OAuth error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
