import { test, expect, open, loginAs } from '../support/test';
import { createUser, prisma } from '../support/db';
import type { Page } from '@playwright/test';

async function signInThroughForm(page: Page, email: string, password: string) {
    await open(page, '/login');
    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill(password);
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
}

test('a customer signs in and lands in the customer dashboard', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    await signInThroughForm(page, customer.email, customer.password);
    await expect(page).toHaveURL(/\/customer$/);
    await expect(page.getByText(customer.fullName).first()).toBeVisible();
});

test('a provider signs in and lands in the provider dashboard', async ({ page }) => {
    const provider = await createUser('PROVIDER');
    await signInThroughForm(page, provider.email, provider.password);
    await expect(page).toHaveURL(/\/provider$/);
});

test('signing in by phone number works on the API the mobile app uses', async ({ request, playwright }) => {
    const customer = await createUser('CUSTOMER');
    const res = await request.post('/api/auth/login', {
        data: { identifier: customer.phone, password: customer.password },
    });
    expect(res.status()).toBe(200);
    const { token } = await res.json();

    // A cookie-less client, authenticating the way the mobile app does.
    const mobile = await playwright.request.newContext({
        baseURL: test.info().project.use.baseURL,
        extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const me = await mobile.get('/api/auth/me');
    expect(me.status()).toBe(200);
    expect((await me.json()).id).toBe(customer.id);
    await mobile.dispose();
});

test('a wrong password is refused and the fifth one locks the account', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    await signInThroughForm(page, customer.email, 'Wrong-Passw0rd!');
    await expect(page.getByText('Неверный логин или пароль')).toBeVisible();

    const attempt = () => page.request.post('/api/auth/login', {
        data: { identifier: customer.email, password: 'Wrong-Passw0rd!' },
    });
    for (let i = 0; i < 3; i++) expect((await attempt()).status()).toBe(401);
    const fifth = await attempt();
    expect((await fifth.json()).error).toContain('заблокирован на 15 минут');

    const row = await prisma.user.findUniqueOrThrow({ where: { id: customer.id } });
    expect(row.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
});

test('signing out ends the session everywhere, not just in this browser', async ({ page, playwright }) => {
    const customer = await createUser('CUSTOMER');
    const login = await page.request.post('/api/auth/login', {
        data: { identifier: customer.email, password: customer.password },
    });
    const { token } = await login.json();

    await open(page, '/customer');
    await page.getByRole('button', { name: new RegExp(customer.fullName) }).click();
    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page).not.toHaveURL(/\/customer/);

    expect((await page.request.get('/api/auth/me')).status()).toBe(401);

    // The token itself is dead too (tokenVersion was bumped) — a copy held by
    // the mobile app or another tab is refused.
    const elsewhere = await playwright.request.newContext({
        baseURL: test.info().project.use.baseURL,
        extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    expect((await elsewhere.get('/api/profile')).status()).toBe(401);
    await elsewhere.dispose();

    await page.goto('/customer');
    await expect(page).toHaveURL(/\/login$/);
});

test('changing the password signs out old sessions and the new password works', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    await loginAs(page, customer);
    const newPassword = 'E2e-Chang3d-Pass!';

    const wrong = await page.request.post('/api/auth/change-password', {
        data: { currentPassword: 'Wrong-Passw0rd!', newPassword },
    });
    expect(wrong.status()).toBe(400);

    const weak = await page.request.post('/api/auth/change-password', {
        data: { currentPassword: customer.password, newPassword: 'short' },
    });
    expect(weak.status()).toBe(400);

    const ok = await page.request.post('/api/auth/change-password', {
        data: { currentPassword: customer.password, newPassword },
    });
    expect(ok.status()).toBe(200);

    const login = (password: string) =>
        page.request.post('/api/auth/login', { data: { identifier: customer.email, password } });
    expect((await login(customer.password)).status()).toBe(401);
    expect((await login(newPassword)).status()).toBe(200);
});
