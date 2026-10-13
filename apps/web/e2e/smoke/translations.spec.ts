import { test, expect, untranslatedKeys, useTajik } from '../support/test';

// Every string on every public page, in both languages. A key missing from
// tj.json falls back to Russian; one missing from both shows up as the raw key.

const PAGES = [
    '/', '/tasks', '/how-it-works', '/professionals', '/help', '/safety', '/privacy', '/terms',
    '/mobile-app', '/login', '/register', '/register?type=customer', '/register?type=provider',
    '/forgot-password', '/delete-account', '/access-denied', '/login?error=oauth_failed',
    '/this-page-does-not-exist', '/maintenance',
];

for (const locale of ['ru', 'tj'] as const) {
    test(`no page shows a raw translation key in ${locale}`, async ({ page, context, baseURL }) => {
        test.setTimeout(180_000);
        if (locale === 'tj') await useTajik(context, baseURL!);

        for (const path of PAGES) {
            await page.goto(path);
            await page.waitForLoadState('networkidle');
            await expect(page.locator('html'), path).toHaveAttribute('lang', locale);
            expect(await untranslatedKeys(page), `${locale} ${path}`).toEqual([]);
        }
    });
}

test('Tajik pages are actually in Tajik, not a Russian fallback', async ({ page, context, baseURL }) => {
    await useTajik(context, baseURL!);
    // ӣ ӯ ҳ қ ғ ҷ do not occur in Russian.
    const tajikLetters = /[ӣӯҳқғҷ]/;
    for (const path of ['/', '/tasks', '/how-it-works', '/login', '/register?type=customer', '/help', '/safety']) {
        await page.goto(path);
        const heading = await page.locator('h1, h2').first().innerText();
        const body = await page.locator('body').innerText();
        expect(tajikLetters.test(body), `${path}: "${heading}"`).toBe(true);
    }
});
