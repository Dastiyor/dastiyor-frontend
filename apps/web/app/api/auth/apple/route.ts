import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const clientId = process.env.APPLE_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({ error: 'Apple Sign In not configured' }, { status: 503 });
    }

    const url = new URL(request.url);
    const role = url.searchParams.get('role') || 'customer';

    const state = Buffer.from(JSON.stringify({ role })).toString('base64url');
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/apple/callback`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code id_token',
        response_mode: 'form_post',
        scope: 'name email',
        state,
    });

    return NextResponse.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
}
