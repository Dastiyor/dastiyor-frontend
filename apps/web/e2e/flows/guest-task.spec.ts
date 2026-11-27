import { test, expect, open } from '../support/test';
import { createUser, e2eTag, prisma } from '../support/db';
import { googleToken, oauthIdentity } from '../support/providers';

const TITLE = 'например, Починить протекающий кран на кухне';

test('a guest fills in a task, signs in at publish, and publishes the same task', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    const title = `${e2eTag()} Повесить полку`;

    await open(page, '/create-task');
    await page.getByPlaceholder(TITLE).fill(title);
    await page.locator('select').nth(0).selectOption('Ремонт');
    await page.getByRole('button', { name: 'Опубликовать' }).click();

    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)create-task$/);
    await page.getByRole('link', { name: 'Войти по паролю' }).click();
    await page.locator('#login-email').fill(customer.email);
    await page.locator('#login-password').fill(customer.password);
    await page.locator('form').getByRole('button', { name: 'Войти' }).click();

    await expect(page).toHaveURL(/\/create-task$/);
    await expect(page.getByPlaceholder(TITLE)).toHaveValue(title);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Опубликовать' }).click();
    await page.waitForURL(/\/tasks\/[a-z0-9]+$/);
    expect(await prisma.task.count({ where: { userId: customer.id, title } })).toBe(1);
});

test('Google sign-in returns to the task form', async ({ page }) => {
    const identity = oauthIdentity('google-return');
    await createUser('CUSTOMER', { googleId: identity.sub });
    // The account is found by its Google id, whatever the email in the token.
    const start = await page.request.get('/api/auth/google?redirect=%2Fcreate-task', { maxRedirects: 0 });
    const state = new URL(start.headers()['location']).searchParams.get('state')!;

    await page.goto(`/api/auth/google/callback?code=${encodeURIComponent(googleToken(identity))}&state=${encodeURIComponent(state)}`);

    await expect(page).toHaveURL(/\/create-task$/);
    await expect(page.getByPlaceholder(TITLE)).toBeVisible();
    expect((await page.request.get('/api/auth/me')).ok()).toBe(true);
});
