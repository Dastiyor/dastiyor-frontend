import { test, expect } from '../support/test';

// Runs in the smoke-mobile project (Pixel 7 viewport).

for (const path of ['/', '/tasks', '/login', '/register?type=customer', '/how-it-works']) {
    test(`${path} fits a phone screen without sideways scrolling`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('h1, h2').first()).toBeVisible();
        const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
    });
}

test('the mobile menu opens and navigates', async ({ page }) => {
    await page.goto('/');
    await page.locator('header button[aria-label]').first().click();
    await page.locator('a[href="/tasks"]').filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/tasks$/);
});

test('the login form is usable on a phone', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#login-email')).toBeInViewport();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('form button[type="submit"]')).toBeVisible();
});
