import { NextResponse } from 'next/server';
import { upsertOAuthUser, oauthCookieOptions } from '@/lib/oauth';
import { getClientIP } from '@/lib/rate-limit';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (error || !code) {
        return NextResponse.redirect(`${appUrl}/login?error=oauth_cancelled`);
    }

    try {
        let role = 'customer';
        if (state) {
            try {
                const parsed = JSON.parse(Buffer.from(state, 'base64url').toString());
                role = parsed.role || 'customer';

                // CSRF check: verify nonce matches the cookie set during initiation
                const cookieStore = await cookies();
                const storedNonce = cookieStore.get('oauth_state_nonce')?.value;
                if (!storedNonce || !parsed.nonce || storedNonce !== parsed.nonce) {
                    console.error('Google OAuth: state nonce mismatch — possible CSRF');
                    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
                }
            } catch {
                return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
            }
        } else {
            // No state at all — reject to prevent CSRF
            return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
        }

        const redirectUri = `${appUrl}/api/auth/google/callback`;

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenRes.ok) throw new Error('Token exchange failed');
        const tokens = await tokenRes.json();

        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!userRes.ok) throw new Error('Failed to get user info');
        const googleUser = await userRes.json();

        const { user, token } = await upsertOAuthUser({
            provider: 'google',
            providerId: googleUser.sub,
            email: googleUser.email,
            name: googleUser.name || googleUser.email.split('@')[0],
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
        console.error('Google OAuth callback error:', err);
        return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
    }
}
