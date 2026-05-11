import { NextResponse } from 'next/server';
import { upsertOAuthUser } from '@/lib/oauth';
import { getClientIP } from '@/lib/rate-limit';

export async function POST(request: Request) {
    try {
        const { accessToken, role } = await request.json();

        if (!accessToken) {
            return NextResponse.json({ error: 'Access token required' }, { status: 400 });
        }

        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userRes.ok) {
            return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
        }

        const googleUser = await userRes.json();

        if (!googleUser.sub || !googleUser.email) {
            return NextResponse.json({ error: 'Incomplete Google profile' }, { status: 401 });
        }

        const { user, token } = await upsertOAuthUser({
            provider: 'google',
            providerId: googleUser.sub,
            email: googleUser.email,
            name: googleUser.name || googleUser.email.split('@')[0],
            role: role || 'customer',
            ipAddress: getClientIP(request),
        });

        return NextResponse.json({
            token,
            user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
        });

    } catch (err) {
        console.error('Google mobile OAuth error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
