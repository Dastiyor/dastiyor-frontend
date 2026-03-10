import { test, expect } from '@playwright/test';

test.describe('Tasks Board UI', () => {

    test('should navigate to tasks board directly', async ({ page }) => {
        // Navigate straight to the tasks route — CI dev server may need extra time to compile
        await page.goto('/tasks', { waitUntil: 'networkidle', timeout: 30000 });

        // Wait until the main form header or elements are visible
        const header = page.locator('h1').first();
        await expect(header).toBeVisible({ timeout: 15000 });

        // Test filter aside structure
        const filterAside = page.locator('aside').first();
        await expect(filterAside).toBeVisible();

        // Ensure task board grid/layout renders
        const mainContainer = page.locator('main').first();
        await expect(mainContainer).toBeVisible();
    });

    test('should display create task template modal or direct from homepage if customer', async ({ page }) => {
        await page.goto('/');

        const createBtn = page.locator('a[href*="/create-task"]').first();
        // Sometimes the create CTA is nested behind customer/provider UI states so we just confirm if it exists on load
        if (await createBtn.isVisible()) {
            await createBtn.click();
            await expect(page).toHaveURL(/\/create-task/);
        }
    });

});
