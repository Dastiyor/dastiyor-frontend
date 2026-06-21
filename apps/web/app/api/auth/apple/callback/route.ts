import { NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { upsertOAuthUser, oauthCookieOptions } from '@/lib/oauth';
import { getClientIP } from '@/lib/rate-limit';

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const appleJWKS = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

async function verifyAppleToken(idToken: string): Promise<{ sub: string; email?: string }> {
    const clientId = process.env.APPLE_CLIENT_ID;
    if (!clientId) throw new Error('APPLE_CLIENT_ID not configured');

    const { payload } = await jwtVerify(idToken, appleJWKS, {
        issuer: 'https://appleid.apple.com',
        audience: clientId,
    });

    if (!payload.sub || typeof payload.sub !== 'string') {
        throw new Error('Invalid Apple token: missing sub');
    }

    return {
        sub: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
    };
}

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

        // Verify state nonce against cookie to prevent CSRF
        const cookieHeader = request.headers.get('cookie') || '';
        const storedNonce = cookieHeader
            .split(';')
            .map(c => c.trim())
            .find(c => c.startsWith('oauth_state_nonce='))
            ?.split('=')[1];

        let role = 'customer';
        if (state) {
            try {
                const parsed = JSON.parse(Buffer.from(state, 'base64url').toString());
                role = parsed.role || 'customer';

                // CSRF check: verify nonce matches what we stored in the cookie
                if (storedNonce && parsed.nonce && parsed.nonce !== storedNonce) {
                    console.error('Apple OAuth: state nonce mismatch — possible CSRF');
                    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
                }
            } catch { /* ignore malformed state */ }
        }

        // Cryptographically verify the Apple id_token signature via JWKS
        const applePayload = await verifyAppleToken(idToken);
        const appleUserId = applePayload.sub;
        const appleEmail = applePayload.email || '';

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
        // Clear the CSRF nonce cookie
        response.cookies.set('oauth_state_nonce', '', { maxAge: 0, path: '/' });
        return response;

    } catch (err) {
        console.error('Apple OAuth callback error:', err);
        return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
    }
}
