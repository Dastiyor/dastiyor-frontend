import { test, expect } from '../support/test';
import { E2E_EMAIL_DOMAIN } from '../support/env';
import type { Page } from '@playwright/test';

// On a slow phone the page is on screen for several seconds before React
// attaches. These pin down what a visitor can do in that window.

test.describe('before any script has run', () => {
    // With scripts off the page stays exactly as the server sent it.
    test.use({ javaScriptEnabled: false });

    test('the language switcher still switches language', async ({ page }) => {
        await page.goto('/tasks?query=zzz');
        await page.getByRole('link', { name: 'Тоҷикӣ' }).click();

        await expect(page).toHaveURL(/\/tasks\?query=zzz$/);
        await expect(page.locator('html')).toHaveAttribute('lang', 'tj');
        await expect(page.getByRole('link', { name: 'Русский' })).toBeVisible();
    });

    for (const path of ['/login', '/register?type=customer', '/forgot-password']) {
        test(`${path} cannot be submitted, so its fields cannot end up in the URL`, async ({ page }) => {
            await page.goto(path);
            const form = page.locator('form');
            await expect(form.locator('button[type="submit"]')).toBeDisabled();
            // Belt and braces: even a native submit would not be a GET.
            await expect(form).toHaveAttribute('method', 'post');

            await form.locator('input').first().press('Enter');
            expect(new URL(page.url()).search).toBe(path.includes('?') ? '?type=customer' : '');
        });
    }
});

test.describe('typed before the page hydrates', () => {
    /** Loads the page with every script held back, until the returned function is called. */
    async function openUnhydrated(page: Page, url: string) {
        let release!: () => void;
        const held = new Promise<void>(resolve => { release = resolve; });
        await page.route(/\/_next\/static\/.*\.js/, async route => {
            await held;
            await route.continue();
        });
        await page.goto(url, { waitUntil: 'commit' });
        return async () => {
            release();
            await page.waitForLoadState('networkidle');
        };
    }

    test('the signup form keeps the phone and password', async ({ page }) => {
        // Answered here, so nothing reaches the server and no SMS can be sent.
        let sentPhone: string | undefined;
        await page.route('**/api/auth/verify-send', route => {
            sentPhone = route.request().postDataJSON().phone;
            return route.fulfill({ status: 400, json: { error: 'stopped by the test' } });
        });

        const hydrate = await openUnhydrated(page, '/register?type=customer');
        await page.locator('#reg-fullName').fill('Ранний Пользователь');
        await page.locator('#reg-email').fill(`early${E2E_EMAIL_DOMAIN}`);
        await page.locator('#reg-phone').fill('901234567');
        await page.locator('#reg-password').fill('Str0ng-Passw0rd!');
        await hydrate();

        await expect(page.locator('#reg-phone')).toHaveValue('901234567');
        await expect(page.getByText(/^✓/)).toBeVisible();

        await page.getByRole('button', { name: 'Отправить код' }).click();
        await expect.poll(() => sentPhone).toBe('+992901234567');
    });

    test('password recovery keeps the address', async ({ page }) => {
        const hydrate = await openUnhydrated(page, '/forgot-password');
        await page.locator('#fp-identifier').fill(`early${E2E_EMAIL_DOMAIN}`);
        await hydrate();

        await page.getByRole('button', { name: 'Отправить ссылку' }).click();
        await expect(page.getByRole('heading', { name: 'Письмо отправлено' })).toBeVisible();
    });

    test('the home page search keeps the query', async ({ page }) => {
        const hydrate = await openUnhydrated(page, '/');
        await page.getByPlaceholder('С чем вам нужна помощь?').fill('кран');
        await hydrate();

        await page.getByRole('button', { name: 'Найти', exact: true }).click();
        await expect(page).toHaveURL(/\/tasks\?query=/);
        expect(new URL(page.url()).searchParams.get('query')).toBe('кран');
    });
});
