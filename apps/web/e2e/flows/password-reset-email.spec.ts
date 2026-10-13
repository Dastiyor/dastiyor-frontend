import { test, expect, open, newSession } from '../support/test';
import { createUser, prisma } from '../support/db';

// The email itself is not sent in a test run (no mail key); the link it would
// carry is rebuilt from the token the request stored.

async function requestReset(page: import('@playwright/test').Page, email: string) {
    await open(page, '/forgot-password');
    await page.locator('#fp-identifier').fill(email);
    await page.getByRole('button', { name: 'Отправить ссылку' }).click();
    await expect(page.getByRole('heading', { name: 'Письмо отправлено' })).toBeVisible();
    const reset = await prisma.passwordReset.findFirstOrThrow({
        where: { user: { email }, used: false },
        orderBy: { createdAt: 'desc' },
    });
    return reset.token;
}

test('a reset link sets a new password, works once, and signs out old sessions', async ({ page, browser }) => {
    const user = await createUser('CUSTOMER');
    const newPassword = 'E2e-Reset-Passw0rd!';

    // A session from before the reset, on another device.
    const { context: oldDevice, page: oldPage } = await newSession(browser, user);

    const token = await requestReset(page, user.email);
    await open(page, `/reset-password?token=${token}`);
    const fields = page.locator('form input');
    await fields.nth(0).fill(newPassword);
    await fields.nth(1).fill('Something-Else-1!');
    await page.getByRole('button', { name: 'Сбросить пароль' }).click();
    await expect(page.getByText('Пароли не совпадают')).toBeVisible();

    await fields.nth(1).fill(newPassword);
    await page.getByRole('button', { name: 'Сбросить пароль' }).click();
    await expect(page.getByText('Пароль изменён!')).toBeVisible();

    // The old device is signed out, and — from its own address, so this test
    // stays inside the per-address sign-in limit — only the new password works.
    expect((await oldPage.request.get('/api/profile')).status()).toBe(401);
    const login = (password: string) =>
        oldPage.request.post('/api/auth/login', { data: { identifier: user.email, password } });
    expect((await login(user.password)).status()).toBe(401);
    expect((await login(newPassword)).status()).toBe(200);

    // The link is spent.
    const again = await oldPage.request.post('/api/auth/reset-password', { data: { token, password: 'E2e-Another-Pass1!' } });
    expect(again.status()).toBe(400);
    await oldDevice.close();
    await page.goto(`/reset-password?token=${token}`);
    await expect(page.getByRole('link', { name: /Запросить новую/ })).toBeVisible();
});

test('asking again cancels the earlier link', async ({ page }) => {
    const user = await createUser('CUSTOMER');
    const first = await requestReset(page, user.email);
    const second = await requestReset(page, user.email);
    expect(second).not.toBe(first);

    const stale = await page.request.post('/api/auth/reset-password', { data: { token: first, password: 'E2e-Reset-Passw0rd!' } });
    expect(stale.status()).toBe(400);
    const fresh = await page.request.get(`/api/auth/reset-password?token=${second}`);
    expect((await fresh.json()).valid).toBe(true);
});

test('an expired, unknown or weak-password reset is refused', async ({ page }) => {
    const user = await createUser('CUSTOMER');
    const token = await requestReset(page, user.email);

    const weak = await page.request.post('/api/auth/reset-password', { data: { token, password: 'short' } });
    expect(weak.status()).toBe(400);

    await prisma.passwordReset.updateMany({ where: { token }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const expired = await page.request.post('/api/auth/reset-password', { data: { token, password: 'E2e-Reset-Passw0rd!' } });
    expect(expired.status()).toBe(400);

    await page.goto('/reset-password?token=not-a-real-token');
    await expect(page.getByRole('link', { name: /Запросить новую/ })).toBeVisible();

    // The password never changed.
    const login = await page.request.post('/api/auth/login', { data: { identifier: user.email, password: user.password } });
    expect(login.status()).toBe(200);
});
