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
    expect(xml).not.toContain('/subscription');
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

test('each page names itself, on the www host, as canonical', async ({ page }) => {
    for (const path of ['/', '/tasks', '/professionals', '/how-it-works', '/help', '/safety', '/terms', '/privacy']) {
        await page.goto(path);
        const href = await page.locator('link[rel="canonical"]').getAttribute('href');
        expect(href?.replace(/\/$/, ''), path).toBe(`https://www.dastiyor.com${path.replace(/\/$/, '')}`);
    }
    // No canonical is better than another page's.
    await page.goto('/login');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test('an old example-task link goes to the task list', async ({ page }) => {
    await page.goto('/tasks/preview-0');
    await expect(page).toHaveURL(/\/tasks$/);
});

test('the task list arrives with its tasks in the HTML', async ({ request }) => {
    const { pagination } = await (await request.get('/api/tasks?limit=1')).json();
    test.skip(pagination.total === 0, 'no open tasks');
    expect(await (await request.get('/tasks')).text()).toMatch(/href="\/tasks\/[a-z0-9]{20,}"/);
});
