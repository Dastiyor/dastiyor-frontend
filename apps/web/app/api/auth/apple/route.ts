import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function GET(request: Request) {
    const clientId = process.env.APPLE_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({ error: 'Apple Sign In not configured' }, { status: 503 });
    }

    const url = new URL(request.url);
    const role = url.searchParams.get('role') || 'customer';

    // CSRF protection: include a random nonce in state and store it in a short-lived cookie
    const nonce = randomBytes(16).toString('hex');
    const state = Buffer.from(JSON.stringify({ role, nonce })).toString('base64url');
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/apple/callback`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code id_token',
        response_mode: 'form_post',
        scope: 'name email',
        state,
    });

    const response = NextResponse.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
    response.cookies.set('oauth_state_nonce', nonce, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 300, // 5 minutes — enough time to complete auth
        path: '/',
    });
    return response;
}
