import { test, expect } from '../support/test';

const DASHBOARD_PAGES = [
    '/customer',
    '/customer/my-tasks',
    '/customer/messages',
    '/customer/profile',
    '/provider',
    '/provider/task-feed',
    '/provider/my-responses',
    '/provider/profile',
];

for (const path of DASHBOARD_PAGES) {
    test(`${path} sends a signed-out visitor to login`, async ({ page }) => {
        await page.goto(path);
        await expect(page).toHaveURL(/\/login$/);
    });
}

test('create-task sends a signed-out visitor to login and remembers where they were going', async ({ page }) => {
    await page.goto('/create-task');
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)create-task$/);
});

const PRIVATE_API: Array<[method: 'get' | 'post' | 'put' | 'delete', path: string]> = [
    ['get', '/api/auth/me'],
    ['get', '/api/profile'],
    ['put', '/api/profile'],
    ['get', '/api/my-tasks'],
    ['get', '/api/my-responses'],
    ['get', '/api/notifications'],
    ['get', '/api/conversations'],
    ['get', '/api/messages?userId=someone'],
    ['post', '/api/messages'],
    ['post', '/api/tasks'],
    ['post', '/api/responses'],
    ['post', '/api/responses/reject'],
    ['post', '/api/tasks/accept'],
    ['post', '/api/tasks/complete'],
    ['post', '/api/tasks/cancel'],
    ['post', '/api/tasks/favorite'],
    ['post', '/api/reviews'],
    ['post', '/api/auth/change-password'],
    ['delete', '/api/account'],
];

for (const [method, path] of PRIVATE_API) {
    test(`${method.toUpperCase()} ${path} is 401 without a session`, async ({ request }) => {
        const res = await request[method](path, method === 'get' ? undefined : { data: {} });
        expect(res.status()).toBe(401);
    });
}

test('a forged session cookie is not a session', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{
        name: 'token',
        value: 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImZha2UiLCJyb2xlIjoiQ1VTVE9NRVIifQ.not-a-real-signature',
        url: test.info().project.use.baseURL!,
    }]);
    const page = await context.newPage();

    expect((await page.request.get('/api/auth/me')).status()).toBe(401);
    await page.goto('/customer');
    await expect(page).toHaveURL(/\/login$/);
    await context.close();
});

test('the seed and cron endpoints are closed to the public', async ({ request }) => {
    expect((await request.get('/api/seed')).status()).not.toBe(200);
    expect((await request.get('/api/cron/expire-subscriptions')).status()).not.toBe(200);
});

test('pages are served with the security headers', async ({ request }) => {
    const headers = (await request.get('/')).headers();
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
});
