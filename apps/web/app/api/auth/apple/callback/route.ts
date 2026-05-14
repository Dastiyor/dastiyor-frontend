import { NextResponse } from 'next/server';
import { upsertOAuthUser, oauthCookieOptions } from '@/lib/oauth';
import { getClientIP } from '@/lib/rate-limit';

// Apple sends a POST with form data (response_mode: form_post)
export async function POST(request: Request) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    try {
        const body = await request.formData();
        const code = body.get('code') as string;
        const idToken = body.get('id_token') as string;
        const state = body.get('state') as string;
        const userJson = body.get('user') as string; // Only present on first sign-in

        if (!code || !idToken) {
            return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
        }

        // Decode Apple's id_token payload (trusted: came via Apple's HTTPS POST)
        const [, payloadB64] = idToken.split('.');
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
        const appleUserId: string = payload.sub;
        const appleEmail: string = payload.email || '';

        let role = 'customer';
        if (state) {
            try {
                const parsed = JSON.parse(Buffer.from(state, 'base64url').toString());
                role = parsed.role || 'customer';
            } catch { /* ignore malformed state */ }
        }

        // Apple provides name only on the very first sign-in
        let name = appleEmail.split('@')[0] || 'User';
        if (userJson) {
            try {
                const info = JSON.parse(userJson);
                const full = [info.name?.firstName, info.name?.lastName].filter(Boolean).join(' ');
                if (full) name = full;
            } catch { /* ignore */ }
        }

        const { user, token } = await upsertOAuthUser({
            provider: 'apple',
            providerId: appleUserId,
            email: appleEmail,
            name,
            role,
            ipAddress: getClientIP(request),
        });

        const dashboard = user.role === 'PROVIDER' ? '/provider' : '/customer';
        const response = NextResponse.redirect(`${appUrl}${dashboard}`);
        response.cookies.set('token', token, oauthCookieOptions());
        return response;

    } catch (err) {
        console.error('Apple OAuth callback error:', err);
        return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
    }
}
