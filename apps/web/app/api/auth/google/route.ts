import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        // Credentials not configured yet — fail gracefully to a friendly message
        // instead of a raw 503. See SETUP checklist for required env vars.
        return NextResponse.redirect(`${appUrl}/login?error=oauth_unavailable`);
    }

    const role = url.searchParams.get('role') || 'customer';

    // CSRF protection: include a random nonce in state and store it in a short-lived cookie
    const nonce = randomBytes(16).toString('hex');
    const state = Buffer.from(JSON.stringify({ role, nonce })).toString('base64url');
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'online',
        prompt: 'select_account',
    });

    const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    response.cookies.set('oauth_state_nonce', nonce, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 300, // 5 minutes
        path: '/',
    });
    return response;
}
