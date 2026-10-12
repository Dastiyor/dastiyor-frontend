import { test, expect } from '../support/test';

// The parts of Google/Apple sign-in that need neither provider. What happens
// after the provider answers is in flows/oauth.spec.ts.

for (const provider of ['google', 'apple'] as const) {
    test(`the ${provider} button leads to ${provider}, or says sign-in is unavailable`, async ({ request }) => {
        const res = await request.get(`/api/auth/${provider}?role=customer`, { maxRedirects: 0 });
        expect(res.status()).toBe(307);
        expect(res.headers()['location']).toMatch(
            provider === 'google'
                ? /^https:\/\/accounts\.google\.com\/|\/login\?error=oauth_unavailable$/
                : /^https:\/\/appleid\.apple\.com\/|\/login\?error=oauth_unavailable$/,
        );
    });
}

test('login explains each way a Google or Apple sign-in can fail', async ({ page }) => {
    const messages = {
        oauth_cancelled: 'Вход отменён',
        oauth_unavailable: 'Вход через Google и Apple временно недоступен',
        oauth_failed: 'Ошибка входа через OAuth',
    };
    for (const [error, message] of Object.entries(messages)) {
        await page.goto(`/login?error=${error}`);
        await expect(page.getByText(message)).toBeVisible();
    }
});

test('the app sign-in endpoints refuse a request with no token', async ({ request }) => {
    expect((await request.post('/api/auth/google/mobile', { data: {} })).status()).toBe(400);
    expect((await request.post('/api/auth/apple/mobile', { data: {} })).status()).toBe(400);
});
