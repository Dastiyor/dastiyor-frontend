import { NextResponse } from 'next/server';
import { oauthCookieOptions } from '@/lib/oauth';
import { mustVerifyPhoneFirst } from '@/lib/phone-gate';
import { safeRedirect, withRedirect } from '@/lib/safe-redirect';
import { AUTH_EVENT_COOKIE } from '@/lib/auth-event';

/** The target carried in the OAuth `state`; '' when absent or not a path here. */
export function redirectFromState(state: string | null): string {
    try {
        return safeRedirect(JSON.parse(Buffer.from(state || '', 'base64url').toString()).redirect);
    } catch {
        return '';
    }
}

/**
 * The end of a web Google/Apple sign-in, shared by both callbacks: back to the
 * page the person started from (else their dashboard), by way of phone
 * verification when the account still needs it, with the session cookie set.
 */
export function oauthSignedInResponse({ appUrl, provider, user, token, isNew, redirect }: {
    appUrl: string;
    provider: 'google' | 'apple';
    user: { role: string; phoneVerified: boolean; googleId?: string | null; appleId?: string | null };
    token: string;
    isNew: boolean;
    redirect: string;
}) {
    const target = redirect || (user.role === 'PROVIDER' ? '/provider' : '/customer');
    const destination = mustVerifyPhoneFirst(user) ? withRedirect('/verify-phone', target) : target;
    const response = NextResponse.redirect(`${appUrl}${destination}`);
    response.cookies.set('token', token, oauthCookieOptions());
    response.cookies.set(AUTH_EVENT_COOKIE, `${isNew ? 'sign_up_completed' : 'login_completed'}.${provider}`, {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
    });
    // Clear the CSRF nonce cookie
    response.cookies.set('oauth_state_nonce', '', { maxAge: 0, path: '/' });
    return response;
}
