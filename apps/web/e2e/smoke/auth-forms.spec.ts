import { test, expect, open } from '../support/test';
import { E2E_EMAIL_DOMAIN } from '../support/env';

// Read-only by construction: every request here is one the server rejects
// before it writes anything or sends an SMS.

test('login rejects an unknown account with a readable error', async ({ page }) => {
    await open(page, '/login');
    await expect(page.getByRole('heading', { name: 'С возвращением' })).toBeVisible();

    await page.locator('#login-email').fill(`nobody${E2E_EMAIL_DOMAIN}`);
    await page.locator('#login-password').fill('Wrong-Passw0rd!');
    await page.getByRole('button', { name: 'Войти', exact: true }).click();

    await expect(page.getByText('Неверный логин или пароль')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
});

test('login offers Google, Apple, password recovery and signup', async ({ page }) => {
    await open(page, '/login');
    await expect(page.getByText('Продолжить с Google')).toBeVisible();
    await expect(page.getByText('Продолжить с Apple')).toBeVisible();
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
    await expect(page.locator('main a[href="/register"], form ~ * a[href="/register"]').first()).toBeVisible();
});

test('signup asks for a role first, then shows the matching form', async ({ page }) => {
    await open(page, '/register');
    await expect(page.getByRole('heading', { name: 'Присоединяйтесь к Dastiyor' })).toBeVisible();

    await page.getByRole('button', { name: /Я хочу работать/ }).click();
    await expect(page.getByRole('heading', { name: 'Регистрация как Исполнитель' })).toBeVisible();
    for (const id of ['#reg-fullName', '#reg-email', '#reg-phone', '#reg-password']) {
        await expect(page.locator(id)).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Отправить код' })).toBeVisible();
});

test('signup links preselect the role', async ({ page }) => {
    await open(page, '/register?type=customer');
    await expect(page.getByRole('heading', { name: 'Регистрация как Заказчик' })).toBeVisible();
    await open(page, '/register?type=provider');
    await expect(page.getByRole('heading', { name: 'Регистрация как Исполнитель' })).toBeVisible();
});

test('the phone field accepts nine digits and nothing else', async ({ page }) => {
    await open(page, '/register?type=customer');
    await page.locator('#reg-phone').pressSequentially('90-abc 123 45 678 99');
    await expect(page.locator('#reg-phone')).toHaveValue('901234567');
});

test('a weak password is called out before the form is sent', async ({ page }) => {
    await open(page, '/register?type=customer');
    await page.locator('#reg-password').fill('abc');
    await expect(page.getByText('✓')).toHaveCount(0);
    await page.locator('#reg-password').fill('Str0ng-Passw0rd!');
    await expect(page.getByText(/^✓/)).toBeVisible();
});

test('an account cannot be created without an SMS code', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
        data: {
            fullName: 'No Code',
            email: `no-code${E2E_EMAIL_DOMAIN}`,
            phone: '+992000000001',
            password: 'Str0ng-Passw0rd!',
            role: 'customer',
        },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Неверный или просроченный код');
});

test('an SMS code is not sent to a malformed number', async ({ request }) => {
    const res = await request.post('/api/auth/verify-send', { data: { phone: '12345', type: 'REGISTRATION' } });
    expect(res.status()).toBe(400);
});

test('password recovery by email never reveals whether the address exists', async ({ page }) => {
    await open(page, '/forgot-password');
    await page.locator('#fp-identifier').fill(`nobody${E2E_EMAIL_DOMAIN}`);
    await page.getByRole('button', { name: 'Отправить ссылку' }).click();
    await expect(page.getByRole('heading', { name: 'Письмо отправлено' })).toBeVisible();
});

test('password recovery by phone says when the number is not registered', async ({ page }) => {
    await open(page, '/forgot-password');
    await page.locator('#fp-identifier').fill('+992000000001');
    await page.getByRole('button', { name: 'Отправить ссылку' }).click();
    await expect(page.getByText('Пользователь с таким номером телефона не найден')).toBeVisible();
});

test('sign-in attempts are rate limited', async ({ request }) => {
    // 5 a minute per address (RATE_LIMITS.auth); this test has its own address.
    const attempt = () => request.post('/api/auth/login', {
        data: { identifier: `nobody${E2E_EMAIL_DOMAIN}`, password: 'Wrong-Passw0rd!' },
    });
    for (let i = 0; i < 5; i++) expect((await attempt()).status()).toBe(401);
    expect((await attempt()).status()).toBe(429);
});
