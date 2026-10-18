import fs from 'fs';
import path from 'path';
import { test, expect, open, loginAs } from '../support/test';
import { createTask, createUser, e2eTag, prisma, type E2EUser } from '../support/db';

// Phase 1 from the browser: finding professionals (text, category, city, sort,
// paging) and a provider building a portfolio that shows on their public profile.

// Locally /api/upload writes into public/uploads; every file uploaded here is removed again.
const UPLOADS_DIR = path.resolve(__dirname, '../../public/uploads');
const uploaded: string[] = [];
test.afterAll(() => {
    for (const filename of uploaded) fs.rmSync(path.join(UPLOADS_DIR, filename), { force: true });
});

// The smallest valid PNG: one transparent pixel.
const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
);

/** Completed tasks with reviews, so the provider has a rating and counts to sort by. */
async function review(provider: E2EUser, ratings: number[]) {
    const customer = await createUser('CUSTOMER');
    for (const rating of ratings) {
        const task = await createTask(customer, { status: 'COMPLETED', assignedUserId: provider.id });
        await prisma.review.create({ data: { taskId: task.id, reviewerId: customer.id, reviewedId: provider.id, rating } });
    }
}

/** Provider names on the results page, in the order shown. */
async function shown(page: import('@playwright/test').Page, tag: string) {
    const names = await page.locator('a[href^="/provider/"]').allInnerTexts();
    return names.filter(n => n.includes(tag)).map(n => (n.includes('Сантехник') ? 'plumber' : 'cleaner'));
}

test('professionals can be found by text, category and city, and sorted', async ({ page }) => {
    const tag = e2eTag();
    const plumber = await createUser('PROVIDER', { fullName: `Сантехник ${tag}` });
    const cleaner = await createUser('PROVIDER', { fullName: `Уборщица ${tag}` });
    await prisma.user.update({ where: { id: plumber.id }, data: { categories: ['Сантехника'], city: 'Худжанд', experienceYears: 12 } });
    await prisma.user.update({ where: { id: cleaner.id }, data: { categories: ['Уборка'], city: 'Душанбе', experienceYears: 3 } });
    await review(plumber, [5]);
    await review(cleaner, [4, 4, 4]);

    await open(page, '/professionals');
    await page.locator('#pro-q').fill(tag);
    await page.locator('#pro-q').press('Enter');
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(tag)}`));
    // Default sort is by rating: 5.0 before 4.0.
    await expect.poll(() => shown(page, tag)).toEqual(['plumber', 'cleaner']);

    await page.locator('#pro-sort').selectOption('reviews');
    await expect(page).toHaveURL(/sort=reviews/);
    await expect.poll(() => shown(page, tag)).toEqual(['cleaner', 'plumber']);

    await page.locator('#pro-category').selectOption('Сантехника');
    await expect(page).toHaveURL(/category=/);
    await expect.poll(() => shown(page, tag)).toEqual(['plumber']);

    // Each filter change waits for the URL: the next one builds on the current query string.
    await page.locator('#pro-category').selectOption('');
    await expect(page).not.toHaveURL(/category=/);
    await page.locator('#pro-city').selectOption('Душанбе');
    await expect.poll(() => shown(page, tag)).toEqual(['cleaner']);

    // Searching by skill text, not only the name.
    await prisma.user.update({ where: { id: cleaner.id }, data: { skills: `мойка окон ${tag}-skill` } });
    await open(page, `/professionals?q=${encodeURIComponent(`${tag}-skill`)}`);
    await expect.poll(() => shown(page, tag)).toEqual(['cleaner']);
});

test('the search API pages through results with a total', async ({ request }) => {
    const tag = e2eTag();
    for (const n of [1, 2, 3]) await createUser('PROVIDER', { fullName: `Мастер ${n} ${tag}` });

    const page = async (p: number) => {
        const res = await request.get(`/api/professionals?q=${encodeURIComponent(tag)}&limit=2&page=${p}`);
        expect(res.status()).toBe(200);
        return res.json();
    };
    const first = await page(1);
    const second = await page(2);
    expect(first.total).toBe(3);
    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(1);
    const ids = [...first.items, ...second.items].map((i: { id: string }) => i.id);
    expect(new Set(ids).size).toBe(3);
});

test('a provider builds a portfolio that shows on their public profile', async ({ page }) => {
    const tag = e2eTag();
    const provider = await createUser('PROVIDER', { fullName: `Мастер ${tag}` });
    await loginAs(page, provider);
    await open(page, '/provider/portfolio');

    // First project, with a photo.
    await page.getByRole('button', { name: 'Добавить проект' }).click();
    await page.locator('#pf-title').fill(`${tag} Ванная`);
    await page.locator('#pf-desc').fill('Плитка и сантехника под ключ');
    const uploadDone = page.waitForResponse(r => r.url().endsWith('/api/upload') && r.request().method() === 'POST');
    await page.locator('#pf-photos').setInputFiles({ name: 'bath.png', mimeType: 'image/png', buffer: PNG });
    const upload = await uploadDone;
    expect(upload.status()).toBe(200);
    uploaded.push((await upload.json()).filename);
    await expect(page.getByRole('img', { name: 'Фото 1' })).toBeVisible();
    await page.getByRole('button', { name: 'Сохранить проект' }).click();
    await expect(page.getByText(`${tag} Ванная`)).toBeVisible();

    // Second project, then move it above the first.
    await page.getByRole('button', { name: 'Добавить проект' }).click();
    await page.locator('#pf-title').fill(`${tag} Кухня`);
    await page.getByRole('button', { name: 'Сохранить проект' }).click();
    await expect(page.getByText(`${tag} Кухня`)).toBeVisible();
    const reordered = page.waitForResponse(r => r.url().endsWith('/api/profile/portfolio') && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Выше' }).nth(1).click();
    expect((await reordered).status()).toBe(200);

    const stored = await prisma.portfolioProject.findMany({ where: { userId: provider.id }, orderBy: { order: 'asc' } });
    expect(stored.map(p => p.title)).toEqual([`${tag} Кухня`, `${tag} Ванная`]);
    expect(stored[1].images).toHaveLength(1);

    // Visitors see both projects on the public profile.
    await page.context().clearCookies();
    await open(page, `/provider/${provider.id}`);
    await expect(page.getByText(`${tag} Кухня`)).toBeVisible();
    await expect(page.getByText(`${tag} Ванная`)).toBeVisible();

    // Deleting one removes it for good.
    await loginAs(page, provider);
    await open(page, '/provider/portfolio');
    await page.getByRole('button', { name: 'Удалить' }).first().click();
    await page.getByRole('button', { name: 'Да, удалить' }).click();
    await expect(page.getByText(`${tag} Кухня`)).toHaveCount(0);
    await expect.poll(() => prisma.portfolioProject.count({ where: { userId: provider.id } })).toBe(1);
});
