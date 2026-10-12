import { test, expect, open } from '../support/test';

test('the switcher flips the site to Tajik and the choice survives a reload', async ({ page }) => {
    await open(page, '/tasks');
    await expect(page.getByRole('heading', { name: 'Найти задания' })).toBeVisible();

    await page.getByRole('button', { name: 'Тоҷикӣ' }).click();
    await expect(page.getByRole('heading', { name: 'Ёфтани вазифаҳо' })).toBeVisible();

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'tj');
    await expect(page.getByRole('heading', { name: 'Ёфтани вазифаҳо' })).toBeVisible();

    await page.getByRole('button', { name: 'Русский' }).click();
    await expect(page.getByRole('heading', { name: 'Найти задания' })).toBeVisible();
});

test('the locale cookie is honoured on the first server render', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ name: 'dastiyor_locale', value: 'tj', url: test.info().project.use.baseURL! }]);
    const page = await context.newPage();

    await open(page, '/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'tj');
    await expect(page.getByRole('button', { name: 'Русский' })).toBeVisible();
    await context.close();
});

test('server errors are translated for Tajik readers', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{ name: 'dastiyor_locale', value: 'tj', url: test.info().project.use.baseURL! }]);
    const page = await context.newPage();

    await open(page, '/login');
    await page.locator('#login-email').fill('nobody@e2e.dastiyor.test');
    await page.locator('#login-password').fill('Wrong-Passw0rd!');
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText('Логин ё парол нодуруст аст')).toBeVisible();
    await context.close();
});
