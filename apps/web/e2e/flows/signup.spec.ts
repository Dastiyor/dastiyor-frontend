import { test, expect, open } from '../support/test';
import { e2eEmail, prisma } from '../support/db';
import { E2E_PASSWORD, E2E_SMS_CODE, E2E_SMS_PHONE } from '../support/env';
import { googleToken, oauthIdentity } from '../support/providers';
import type { Page } from '@playwright/test';

// One designated number receives a fixed code and no SMS, so these share it and
// run in order. Register allows three code attempts per number per 15 minutes
// (in memory, reset with the server) — this file uses exactly three.
test.describe.configure({ mode: 'serial' });

const LOCAL_PHONE = E2E_SMS_PHONE.replace(/^\+992/, '');
const NEW_PASSWORD = 'E2e-N3w-Passw0rd!';
let customerEmail: string;
let providerEmail: string;

async function fillSignupForm(page: Page, role: 'customer' | 'provider', email: string) {
    await open(page, `/register?type=${role}`);
    await page.locator('#reg-fullName').fill(role === 'provider' ? 'E2E Новый Исполнитель' : 'E2E Новый Заказчик');
    await page.locator('#reg-email').fill(email);
    await page.locator('#reg-phone').fill(LOCAL_PHONE);
    await page.locator('#reg-password').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Отправить код' }).click();
}

test('a customer signs up: form, SMS code, signed in', async ({ page }) => {
    customerEmail = e2eEmail('signup-customer');
    await fillSignupForm(page, 'customer', customerEmail);

    await expect(page.locator('#reg-code')).toBeVisible();
    await expect(page.getByText(E2E_SMS_PHONE)).toBeVisible();

    await page.locator('#reg-code').fill('000000');
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();
    await expect(page.getByText('Неверный или просроченный код')).toBeVisible();
    expect(await prisma.user.count({ where: { email: customerEmail } })).toBe(0);

    await page.locator('#reg-code').fill(E2E_SMS_CODE);
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();
    await page.waitForURL(url => url.pathname === '/');

    const me = await (await page.request.get('/api/auth/me')).json();
    expect(me).toMatchObject({
        email: customerEmail,
        role: 'CUSTOMER',
        phone: E2E_SMS_PHONE,
        phoneVerified: true,
        phoneVerificationRequired: false,
    });

    await page.goto('/customer');
    await expect(page).toHaveURL(/\/customer$/);
});

test('a number that already has an account cannot sign up again', async ({ page }) => {
    await fillSignupForm(page, 'customer', e2eEmail('signup-duplicate'));
    await expect(page.getByText('Пользователь с таким номером телефона уже существует')).toBeVisible();
    await expect(page.locator('#reg-code')).toHaveCount(0);
});

test('a forgotten password is reset with an SMS code, and the old one stops working', async ({ page }) => {
    await open(page, '/forgot-password');
    await page.locator('#fp-identifier').fill(E2E_SMS_PHONE);
    await page.getByRole('button', { name: 'Отправить ссылку' }).click();

    await page.locator('#fp-code').fill(E2E_SMS_CODE);
    await page.locator('#fp-password').fill(NEW_PASSWORD);
    await page.locator('#fp-confirm').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Сбросить пароль' }).click();
    await expect(page.getByRole('heading', { name: 'Пароль изменён!' })).toBeVisible();

    const login = (password: string) =>
        page.request.post('/api/auth/login', { data: { identifier: customerEmail, password } });
    expect((await login(E2E_PASSWORD)).status()).toBe(401);
    expect((await login(NEW_PASSWORD)).status()).toBe(200);
});

test('a provider signs up and lands in the provider dashboard', async ({ page }) => {
    // Frees the designated number for a second account.
    await prisma.actionLog.deleteMany({ where: { user: { email: customerEmail } } });
    await prisma.user.delete({ where: { email: customerEmail } });

    const email = providerEmail = e2eEmail('signup-provider');
    await fillSignupForm(page, 'provider', email);
    await page.locator('#reg-code').fill(E2E_SMS_CODE);
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();
    await page.waitForURL(url => url.pathname === '/');

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user).toMatchObject({ role: 'PROVIDER', phoneVerified: true });

    await page.goto('/provider');
    await expect(page).toHaveURL(/\/provider$/);
});

test('a Google sign-up verifies a phone and only then reaches the dashboard', async ({ page }) => {
    // Frees the designated number once more.
    await prisma.actionLog.deleteMany({ where: { user: { email: providerEmail } } });
    await prisma.user.delete({ where: { email: providerEmail } });

    const identity = oauthIdentity('google-verify');
    const start = await page.request.get('/api/auth/google?role=customer', { maxRedirects: 0 });
    const state = new URL(start.headers()['location']).searchParams.get('state')!;
    await page.goto(`/api/auth/google/callback?code=${encodeURIComponent(googleToken(identity))}&state=${encodeURIComponent(state)}`);
    await expect(page).toHaveURL(/\/verify-phone\?redirect=(%2F|\/)customer$/);
    await page.waitForLoadState('networkidle');

    await page.locator('#vp-phone').fill(LOCAL_PHONE);
    await page.getByRole('button', { name: 'Отправить код' }).click();

    await page.locator('#vp-code').fill('000000');
    await page.getByRole('button', { name: 'Подтвердить', exact: true }).click();
    await expect(page.getByText('Неверный или просроченный код')).toBeVisible();

    await page.locator('#vp-code').fill(E2E_SMS_CODE);
    await page.getByRole('button', { name: 'Подтвердить', exact: true }).click();
    // By pathname: the verify-phone URL itself ends in "/customer".
    await page.waitForURL(url => url.pathname === '/customer');

    const user = await prisma.user.findUniqueOrThrow({ where: { email: identity.email } });
    expect(user).toMatchObject({ phone: E2E_SMS_PHONE, phoneVerified: true, googleId: identity.sub });
});

