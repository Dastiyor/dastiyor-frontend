/**
 * @jest-environment node
 */
import { oauthSignedInResponse, redirectFromState } from '../oauth-response';

jest.mock('@/lib/oauth', () => ({ oauthCookieOptions: () => ({ httpOnly: true, path: '/' }) }));

const state = (body: object) => Buffer.from(JSON.stringify(body)).toString('base64url');
const base = {
    appUrl: 'https://x.test', provider: 'google' as const, token: 't', isNew: false,
    user: { role: 'CUSTOMER', phoneVerified: true, googleId: 'g' }, redirect: '',
};
const location = (over: Partial<Parameters<typeof oauthSignedInResponse>[0]>) =>
    oauthSignedInResponse({ ...base, ...over }).headers.get('location');

it('reads only a path on this site from the state', () => {
    expect(redirectFromState(state({ redirect: '/create-task' }))).toBe('/create-task');
    expect(redirectFromState(state({ redirect: '//evil.com' }))).toBe('');
    expect(redirectFromState(state({}))).toBe('');
    expect(redirectFromState('not json')).toBe('');
    expect(redirectFromState(null)).toBe('');
});

it('returns to the page the person started from', () => {
    expect(location({ redirect: '/create-task' })).toBe('https://x.test/create-task');
});

it('falls back to the dashboard for the role', () => {
    expect(location({})).toBe('https://x.test/customer');
    expect(location({ user: { ...base.user, role: 'PROVIDER' } })).toBe('https://x.test/provider');
});

it('keeps the target through phone verification', () => {
    expect(location({ redirect: '/tasks/a1', user: { ...base.user, phoneVerified: false } }))
        .toBe('https://x.test/verify-phone?redirect=%2Ftasks%2Fa1');
});

it('sets the session and records a sign-up or a login', () => {
    const signup = oauthSignedInResponse({ ...base, isNew: true, provider: 'apple' });
    expect(signup.cookies.get('token')?.value).toBe('t');
    expect(signup.cookies.get('auth_event')?.value).toBe('sign_up_completed.apple');
    expect(oauthSignedInResponse(base).cookies.get('auth_event')?.value).toBe('login_completed.google');
});
