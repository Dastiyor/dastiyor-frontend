import { test as base, expect, request as apiRequest, type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createHash } from 'crypto';
import type { E2EUser } from './db';
import ru from '../../lib/i18n/locales/ru.json';

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

/**
 * A client like the mobile app: no cookies, a Bearer token from the login
 * route on every request. Dispose it when the test is done.
 */
export async function mobileSession(baseURL: string, user: E2EUser): Promise<APIRequestContext> {
    const ip = ipFor(`mobile:${user.id}:${Date.now()}`);
    const anonymous = await apiRequest.newContext({ baseURL, extraHTTPHeaders: { 'x-forwarded-for': ip } });
    // The app signs in with the phone number, not the email.
    const res = await anonymous.post('/api/auth/login', { data: { identifier: user.phone, password: user.password } });
    expect(res.status(), `mobile login as ${user.phone}`).toBe(200);
    const { token } = await res.json();
    await anonymous.dispose();
    return apiRequest.newContext({
        baseURL,
        extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'x-forwarded-for': ip },
    });
}

/**
 * Translation keys showing on the page instead of text. `t()` returns the key
 * itself when neither the current language nor Russian has it, so a missing
 * string reaches the user as, say, "customer.portal". Looks at visible text and
 * at placeholders, titles and labels.
 */
export async function untranslatedKeys(page: Page): Promise<string[]> {
    return page.evaluate((namespaces) => {
        const isKey = (text: string) => {
            const parts = text.trim().split('.');
            return parts.length >= 2 && namespaces.includes(parts[0]) && parts.every(part => /^[A-Za-z0-9_]+$/.test(part));
        };
        const found = new Set<string>();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = node.textContent ?? '';
            if (isKey(text)) found.add(text.trim());
        }
        for (const el of document.querySelectorAll('[placeholder], [title], [aria-label], [alt]')) {
            for (const attribute of ['placeholder', 'title', 'aria-label', 'alt']) {
                const value = el.getAttribute(attribute);
                if (value && isKey(value)) found.add(value.trim());
            }
        }
        return [...found];
    }, Object.keys(ru));
}

/** Puts a context in Tajik the way the switcher does, before any page is loaded. */
export async function useTajik(context: BrowserContext, baseURL: string) {
    await context.addCookies([{ name: 'dastiyor_locale', value: 'tj', url: baseURL }]);
}

