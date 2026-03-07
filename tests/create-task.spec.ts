import { test, expect } from '@playwright/test';

test.describe('Task Creation Logic', () => {

    test('should prevent unauthenticated users from publishing tasks and redirect to login', async ({ page }) => {
        // Assume unauthenticated direct access handles redirections or allows writing
        await page.goto('/create-task');

        // Wait for the specific heading ensuring it loaded
        await expect(page.locator('h1').first()).toContainText('Создать новое задание', { ignoreCase: true });

        // Inputs are manually wired via component state instead of an HTML form element
        // The first text input is the Title, the first textarea is Description
        const titleInput = page.locator('input[type="text"]').first();
        const descriptionInput = page.locator('textarea').first();
        const publishButton = page.locator('button:has-text("Опубликовать")');

        // Fill short but valid boundary information to trigger submission flow locally in React
        await titleInput.fill('Valid Pipeline Task Boundary Checks');
        await descriptionInput.fill('This ensures the data binds to React hooks state correctly through E2E mock workflows.');

        // Attempting to submit calls /api/tasks, which should natively return 401 Unauthorized
        // and trigger router.push('/login') client-side protecting the write logic.
        await publishButton.click();

        // Ensure that the application correctly halted execution and routed to login.
        await expect(page).toHaveURL(/login/);
    });

});
