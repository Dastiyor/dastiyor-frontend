import { test, expect } from '../support/test';

const PUBLIC_PAGES = [
    '/',
    '/tasks',
    '/how-it-works',
    '/professionals',
    '/help',
    '/safety',
    '/privacy',
    '/terms',
    '/mobile-app',
    '/login',
    '/register',
    '/forgot-password',
    '/delete-account',
    '/maintenance',
];

for (const path of PUBLIC_PAGES) {
    test(`${path} renders without errors`, async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', err => pageErrors.push(err.message));

        const response = await page.goto(path);
        expect(response?.status()).toBe(200);

        await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
        await expect(page).toHaveTitle(/\S/);
        await expect(page.locator('h1, h2').first()).toBeVisible();
        expect(pageErrors).toEqual([]);
    });
}

test('home page leads to the task list and to signup', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Найдите идеального');

    const header = page.locator('header');
    await expect(header.getByRole('link', { name: 'Войти' })).toHaveAttribute('href', '/login');
    await expect(header.getByRole('link', { name: 'Создать задание' })).toHaveAttribute('href', '/create-task');

    await header.getByRole('link', { name: 'Найти задания' }).click();
    await expect(page).toHaveURL(/\/tasks$/);
});

test('footer carries the legal links', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.locator('a[href="/privacy"]')).toBeVisible();
    await expect(footer.locator('a[href="/terms"]')).toBeVisible();
});

test('an unknown URL is a 404 page, not a crash', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('header')).toBeVisible();
});

test('health check reports the database reachable', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok', db: { ok: true } });
});
