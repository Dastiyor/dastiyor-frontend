import { test as base, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createHash } from 'crypto';
import type { E2EUser } from './db';

/**
 * The limiter keys on the forwarded IP (5 auth calls a minute), and every local
 * request would otherwise share one. A distinct address per test keeps tests
 * from rate-limiting each other while each still runs under the real limits.
 */
function ipFor(seed: string) {
    const h = createHash('sha1').update(seed).digest();
    return `10.${h[0]}.${h[1]}.${(h[2] % 254) + 1}`;
}

export const test = base.extend({
    // `provide` is Playwright's `use`; the usual name trips react-hooks/rules-of-hooks.
    extraHTTPHeaders: async ({}, provide, testInfo) => {
        await provide({ 'x-forwarded-for': ipFor(`${testInfo.testId}:${testInfo.retry}:${Date.now()}`) });
    },
});

export { expect };

/** Signs in through the real login route; the session cookie lands in the page's context. */
export async function loginAs(page: Page, user: E2EUser) {
    const res = await page.request.post('/api/auth/login', {
        data: { identifier: user.email, password: user.password },
    });
    expect(res.status(), `login as ${user.email}`).toBe(200);
}

/** A second signed-in browser, for flows with a customer and a provider on screen at once. */
export async function newSession(
    browser: Browser,
    user: E2EUser,
): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext({
        locale: 'ru-RU',
        extraHTTPHeaders: { 'x-forwarded-for': ipFor(`${user.id}:${Date.now()}`) },
    });
    const page = await context.newPage();
    await loginAs(page, user);
    return { context, page };
}

/** The in-app confirm dialog (components/ui/ConfirmDialog.tsx), not a browser one. */
export async function confirmDialog(page: Page) {
    await page.getByRole('button', { name: 'Подтвердить', exact: true }).click();
}

/**
 * Opens a page and waits for React to take over. A controlled input typed into
 * before hydration is reset to its initial value, and a form submitted before
 * it has no handler — so anything that types or clicks starts here.
 */
export async function open(page: Page, url: string) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
}
