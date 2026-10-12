import { test, expect } from '../support/test';
import { createUser, prisma } from '../support/db';
import { appleIdToken, googleToken, oauthIdentity, OAUTH_ENV } from '../support/providers';
import type { Page } from '@playwright/test';

// Google and Apple themselves are played by e2e/support/fake-providers.js.
// Everything on our side of them is real: the redirect, the state check, the
// account that gets created or linked, the session, and where the user lands.

/** Starts the web flow and returns the URL we send the browser to at the provider. */
async function begin(page: Page, provider: 'google' | 'apple', role: 'customer' | 'provider') {
    const res = await page.request.get(`/api/auth/${provider}?role=${role}`, { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    return new URL(res.headers()['location']);
}

const finishGoogle = (page: Page, code: string, state: string) =>
    page.goto(`/api/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);

test.describe('Google on the web', () => {
    test('the sign-in link sends the browser to Google with our client and callback', async ({ page, baseURL }) => {
        const google = await begin(page, 'google', 'provider');
        expect(google.origin + google.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
        expect(google.searchParams.get('client_id')).toBe(OAUTH_ENV.GOOGLE_CLIENT_ID);
        expect(google.searchParams.get('redirect_uri')).toBe(`${baseURL}/api/auth/google/callback`);
        expect(google.searchParams.get('scope')).toContain('email');

        const state = JSON.parse(Buffer.from(google.searchParams.get('state')!, 'base64url').toString());
        expect(state.role).toBe('provider');
        expect(state.nonce).toBeTruthy();
    });

    test('a new customer gets an account and is sent to verify a phone', async ({ page }) => {
        const identity = oauthIdentity('google-new');
        const google = await begin(page, 'google', 'customer');
        await finishGoogle(page, googleToken(identity), google.searchParams.get('state')!);

        await expect(page).toHaveURL(/\/verify-phone\?redirect=(%2F|\/)customer$/);
        const user = await prisma.user.findUniqueOrThrow({ where: { email: identity.email } });
        expect(user).toMatchObject({
            googleId: identity.sub,
            fullName: identity.name,
            role: 'CUSTOMER',
            phoneVerified: false,
            password: null,
        });
    });

    test('the role chosen before signing in is the role of the new account', async ({ page }) => {
        const identity = oauthIdentity('google-provider');
        const google = await begin(page, 'google', 'provider');
        await finishGoogle(page, googleToken(identity), google.searchParams.get('state')!);

        await expect(page).toHaveURL(/\/verify-phone\?redirect=(%2F|\/)provider$/);
        expect((await prisma.user.findUniqueOrThrow({ where: { email: identity.email } })).role).toBe('PROVIDER');
    });

    test('a returning user keeps their role whatever the link asks for', async ({ page, browser }) => {
        const identity = oauthIdentity('google-returning');
        const first = await begin(page, 'google', 'customer');
        await finishGoogle(page, googleToken(identity), first.searchParams.get('state')!);

        const context = await browser.newContext();
        const again = await context.newPage();
        const second = await begin(again, 'google', 'provider');
        await finishGoogle(again, googleToken(identity), second.searchParams.get('state')!);

        await expect(again).toHaveURL(/redirect=(%2F|\/)customer$/);
        expect(await prisma.user.count({ where: { googleId: identity.sub } })).toBe(1);
        expect((await prisma.user.findUniqueOrThrow({ where: { email: identity.email } })).role).toBe('CUSTOMER');
        await context.close();
    });

    test('signing in with the email of a password account links to it', async ({ page }) => {
        const existing = await createUser('PROVIDER');
        const identity = { ...oauthIdentity('google-link'), email: existing.email };
        const google = await begin(page, 'google', 'customer');
        await finishGoogle(page, googleToken(identity), google.searchParams.get('state')!);

        // Already has a verified phone, so straight to its own dashboard.
        await expect(page).toHaveURL(/\/provider$/);
        const user = await prisma.user.findUniqueOrThrow({ where: { email: existing.email } });
        expect(user).toMatchObject({ id: existing.id, googleId: identity.sub, role: 'PROVIDER' });
        expect(user.password).not.toBeNull();
    });

    test('a callback that did not start here is refused', async ({ page, browser }) => {
        const identity = oauthIdentity('google-csrf');
        const code = googleToken(identity);

        // No state at all.
        await page.goto(`/api/auth/google/callback?code=${encodeURIComponent(code)}`);
        await expect(page).toHaveURL(/\/login\?error=oauth_failed$/);

        // A state from someone else's browser: the nonce cookie does not match.
        const google = await begin(page, 'google', 'customer');
        const context = await browser.newContext();
        const victim = await context.newPage();
        await begin(victim, 'google', 'customer');
        await finishGoogle(victim, code, google.searchParams.get('state')!);
        await expect(victim).toHaveURL(/\/login\?error=oauth_failed$/);
        await context.close();

        expect(await prisma.user.count({ where: { email: identity.email } })).toBe(0);
    });

    test('a code Google does not recognise signs nobody in', async ({ page }) => {
        const google = await begin(page, 'google', 'customer');
        await finishGoogle(page, 'not-a-real-code', google.searchParams.get('state')!);

        await expect(page).toHaveURL(/\/login\?error=oauth_failed$/);
        await expect(page.getByText('Ошибка входа через OAuth. Попробуйте ещё раз.')).toBeVisible();
        expect((await page.request.get('/api/auth/me')).status()).toBe(401);
    });

    test('backing out at Google returns to login with a message', async ({ page }) => {
        await page.goto('/api/auth/google/callback?error=access_denied');
        await expect(page).toHaveURL(/\/login\?error=oauth_cancelled$/);
        await expect(page.getByText('Вход отменён')).toBeVisible();
    });
});

test.describe('Apple on the web', () => {
    const finishApple = (page: Page, form: Record<string, string>) =>
        page.request.post('/api/auth/apple/callback', { form, maxRedirects: 0 });

    test('the sign-in link sends the browser to Apple with our client and callback', async ({ page, baseURL }) => {
        const apple = await begin(page, 'apple', 'customer');
        expect(apple.origin + apple.pathname).toBe('https://appleid.apple.com/auth/authorize');
        expect(apple.searchParams.get('client_id')).toBe(OAUTH_ENV.APPLE_CLIENT_ID);
        expect(apple.searchParams.get('redirect_uri')).toBe(`${baseURL}/api/auth/apple/callback`);
        expect(apple.searchParams.get('response_mode')).toBe('form_post');
    });

    test('a new provider gets an account, with the name Apple sends once', async ({ page }) => {
        const identity = oauthIdentity('apple-new');
        const apple = await begin(page, 'apple', 'provider');
        const res = await finishApple(page, {
            code: 'apple-code',
            id_token: appleIdToken(identity, OAUTH_ENV.APPLE_CLIENT_ID),
            state: apple.searchParams.get('state')!,
            user: JSON.stringify({ name: { firstName: 'Фаррух', lastName: 'Каримов' } }),
        });
        expect(new URL(res.headers()['location']).pathname).toBe('/verify-phone');

        const user = await prisma.user.findUniqueOrThrow({ where: { email: identity.email } });
        expect(user).toMatchObject({
            appleId: identity.sub,
            fullName: 'Фаррух Каримов',
            role: 'PROVIDER',
            phoneVerified: false,
        });

        // The session cookie from the callback is a working session.
        await page.goto('/provider');
        await expect(page).toHaveURL(/\/verify-phone\?redirect=(%2F|\/)provider$/);
    });

    test('a genuine Apple token is still refused if the sign-in did not start in this browser', async ({ page, browser }) => {
        const identity = oauthIdentity('apple-csrf');
        const idToken = appleIdToken(identity, OAUTH_ENV.APPLE_CLIENT_ID);

        // A forged POST: no state, and no nonce cookie because nothing was started.
        const context = await browser.newContext();
        const victim = await context.newPage();
        const noState = await finishApple(victim, { code: 'apple-code', id_token: idToken });
        expect(noState.headers()['location']).toMatch(/\/login\?error=oauth_failed$/);

        // The attacker's own state, replayed into the victim's browser.
        const attackerState = (await begin(page, 'apple', 'customer')).searchParams.get('state')!;
        const replayed = await finishApple(victim, { code: 'apple-code', id_token: idToken, state: attackerState });
        expect(replayed.headers()['location']).toMatch(/\/login\?error=oauth_failed$/);

        // And into a browser that has started a sign-in of its own.
        await begin(victim, 'apple', 'customer');
        const mismatched = await finishApple(victim, { code: 'apple-code', id_token: idToken, state: attackerState });
        expect(mismatched.headers()['location']).toMatch(/\/login\?error=oauth_failed$/);

        expect((await victim.request.get('/api/auth/me')).status()).toBe(401);
        expect(await prisma.user.count({ where: { appleId: identity.sub } })).toBe(0);
        await context.close();
    });

    test('an identity token that is not a genuine one for this site is refused', async ({ page }) => {
        const identity = oauthIdentity('apple-bad');
        const good = appleIdToken(identity, OAUTH_ENV.APPLE_CLIENT_ID);
        const [header, payload, signature] = good.split('.');
        const forgedPayload = Buffer.from(JSON.stringify({
            ...JSON.parse(Buffer.from(payload, 'base64url').toString()),
            email: `someone-else@e2e.dastiyor.test`,
        })).toString('base64url');

        const refused = {
            'made for another app': appleIdToken(identity, 'com.someone.else'),
            'expired': appleIdToken(identity, OAUTH_ENV.APPLE_CLIENT_ID, { exp: Math.floor(Date.now() / 1000) - 60 }),
            'from another issuer': appleIdToken(identity, OAUTH_ENV.APPLE_CLIENT_ID, { iss: 'https://evil.example' }),
            'edited after signing': `${header}.${forgedPayload}.${signature}`,
            'not a token': 'garbage',
        };

        for (const [why, idToken] of Object.entries(refused)) {
            const apple = await begin(page, 'apple', 'customer');
            const res = await finishApple(page, {
                code: 'apple-code',
                id_token: idToken,
                state: apple.searchParams.get('state')!,
            });
            expect(res.headers()['location'], why).toMatch(/\/login\?error=oauth_failed$/);
        }
        expect(await prisma.user.count({ where: { appleId: identity.sub } })).toBe(0);
    });
});

test.describe('Google and Apple in the mobile app', () => {
    test('a Google access token signs in and the returned token is a session', async ({ request, playwright, baseURL }) => {
        const identity = oauthIdentity('google-mobile');
        const res = await request.post('/api/auth/google/mobile', {
            data: { accessToken: googleToken(identity), role: 'provider' },
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.user).toMatchObject({
            email: identity.email,
            role: 'PROVIDER',
            phoneVerificationRequired: true,
        });

        const app = await playwright.request.newContext({
            baseURL,
            extraHTTPHeaders: { Authorization: `Bearer ${body.token}` },
        });
        const me = await (await app.get('/api/auth/me')).json();
        expect(me).toMatchObject({ id: body.user.id, phoneVerificationRequired: true });

        // Held until a phone is verified: no responding to tasks yet.
        const respond = await app.post('/api/responses', { data: { taskId: 'any', price: '1', message: 'x' } });
        expect((await respond.json()).code).toBe('PHONE_VERIFICATION_REQUIRED');
        await app.dispose();
    });

    test('a missing or unknown Google token is refused', async ({ request }) => {
        expect((await request.post('/api/auth/google/mobile', { data: {} })).status()).toBe(400);
        expect((await request.post('/api/auth/google/mobile', { data: { accessToken: 'bogus' } })).status()).toBe(401);
    });

    test('an Apple identity token for the app signs in', async ({ request }) => {
        const identity = oauthIdentity('apple-mobile');
        const res = await request.post('/api/auth/apple/mobile', {
            data: {
                identityToken: appleIdToken(identity, OAUTH_ENV.APPLE_BUNDLE_ID),
                fullName: 'Мобильный Пользователь',
                role: 'customer',
            },
        });
        expect(res.status()).toBe(200);
        expect((await res.json()).user).toMatchObject({
            email: identity.email,
            fullName: 'Мобильный Пользователь',
            role: 'CUSTOMER',
            phoneVerificationRequired: true,
        });
    });

    test('an Apple token made for the website, or missing, does not sign in to the app', async ({ request }) => {
        const identity = oauthIdentity('apple-mobile-bad');
        expect((await request.post('/api/auth/apple/mobile', { data: {} })).status()).toBe(400);

        const wrongAudience = await request.post('/api/auth/apple/mobile', {
            data: { identityToken: appleIdToken(identity, OAUTH_ENV.APPLE_CLIENT_ID) },
        });
        expect(wrongAudience.status()).toBe(401);
        expect((await wrongAudience.json()).error).toBe('Недействительный токен Apple');
        expect(await prisma.user.count({ where: { appleId: identity.sub } })).toBe(0);
    });
});
