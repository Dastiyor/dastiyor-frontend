import { test, expect } from '../support/test';

test('robots.txt keeps crawlers out of the API and the dashboards', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const text = await res.text();
    for (const path of ['/api/', '/customer/', '/provider/']) expect(text).toContain(`Disallow: ${path}`);
    expect(text).toMatch(/Sitemap: https:\/\/\S+\/sitemap\.xml/);
});

test('the sitemap lists the public pages and no private ones', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const xml = await res.text();
    for (const path of ['/tasks', '/how-it-works', '/professionals', '/register', '/privacy', '/terms']) {
        expect(xml, path).toContain(`${path}</loc>`);
    }
    expect(xml).not.toMatch(/\/(customer|provider|api)\//);
    // Paid plans are hidden at launch.
    expect(xml).not.toContain('/contractor-plans');
});

test('pages carry a title, a description and a mobile viewport', async ({ page }) => {
    for (const path of ['/', '/tasks', '/how-it-works', '/login']) {
        await page.goto(path);
        await expect(page, path).toHaveTitle(/\S{3,}/);
        expect((await page.locator('meta[name="description"]').getAttribute('content'))?.length, path).toBeGreaterThan(20);
        expect(await page.locator('meta[name="viewport"]').getAttribute('content'), path).toContain('width=device-width');
    }
});

test('every image on the home page loads and has alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const images = await page.locator('img').evaluateAll(nodes =>
        (nodes as HTMLImageElement[]).map(img => ({
            src: img.currentSrc || img.src,
            broken: img.complete && img.naturalWidth === 0,
            hasAlt: img.hasAttribute('alt'),
        })),
    );
    expect(images.filter(i => i.broken).map(i => i.src)).toEqual([]);
    expect(images.filter(i => !i.hasAlt).map(i => i.src)).toEqual([]);
});

test('no link on the home page is dead', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page.locator('a[href^="/"]').evaluateAll(nodes =>
        [...new Set(nodes.map(a => a.getAttribute('href')!))].filter(href => !href.startsWith('/api/')),
    );
    expect(hrefs.length).toBeGreaterThan(5);
    for (const href of hrefs) {
        const res = await request.get(href, { maxRedirects: 0 });
        expect(res.status(), href).toBeLessThan(400);
    }
});
