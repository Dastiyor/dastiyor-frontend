import { test, expect, open, loginAs } from '../support/test';
import { createUser, e2eTag, prisma } from '../support/db';
import fs from 'fs';
import path from 'path';

// Locally the upload route writes into public/uploads (Vercel Blob in
// production); every file a test uploads is deleted again here.
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

test('an image uploads and is served back', async ({ page }) => {
    await loginAs(page, await createUser('CUSTOMER'));
    const res = await page.request.post('/api/upload', {
        multipart: { file: { name: 'photo.png', mimeType: 'image/png', buffer: PNG } },
    });
    expect(res.status(), await res.text()).toBe(200);
    const { url, filename } = await res.json();
    uploaded.push(filename);

    expect(filename).toMatch(/\.png$/);
    const served = await page.request.get(url);
    expect(served.status()).toBe(200);
    expect(Buffer.compare(await served.body(), PNG)).toBe(0);
});

test('anything that is not a small image is refused', async ({ page }) => {
    await loginAs(page, await createUser('CUSTOMER'));
    const upload = (name: string, mimeType: string, buffer: Buffer) =>
        page.request.post('/api/upload', { multipart: { file: { name, mimeType, buffer } } });

    for (const [name, mimeType] of [['run.html', 'text/html'], ['doc.pdf', 'application/pdf'], ['pic.svg', 'image/svg+xml']]) {
        const res = await upload(name, mimeType, Buffer.from('<script>alert(1)</script>'));
        expect(res.status(), name).toBe(400);
    }

    // The limit sits under Vercel's 4.5 MB request cap, so it is this route
    // that answers, with a message, and not the platform with a 413.
    const tooBig = await upload('big.png', 'image/png', Buffer.alloc(4 * 1024 * 1024 + 1));
    expect(tooBig.status()).toBe(400);
    expect((await tooBig.json()).error).toContain('4 МБ');

    const none = await page.request.post('/api/upload', { multipart: { note: 'no file here' } });
    expect(none.status()).toBe(400);
});

test('uploading needs a session', async ({ request }) => {
    const res = await request.post('/api/upload', {
        multipart: { file: { name: 'photo.png', mimeType: 'image/png', buffer: PNG } },
    });
    expect(res.status()).toBe(401);
});

test('a photo attached while posting a task shows on the task', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    const title = `${e2eTag()} Покрасить забор`;
    await loginAs(page, customer);
    await open(page, '/create-task');

    await page.locator('input[type="file"]').setInputFiles({ name: 'fence.png', mimeType: 'image/png', buffer: PNG });
    const preview = page.locator('img[src^="/uploads/"]');
    await expect(preview).toBeVisible();
    uploaded.push((await preview.getAttribute('src'))!.split('/').pop()!);

    await page.getByPlaceholder('например, Починить протекающий кран на кухне').fill(title);
    await page.locator('select').nth(0).selectOption('Ремонт');
    await page.getByPlaceholder('Опишите проблему или задачу подробно...')
        .fill('Покрасить деревянный забор, краска есть. Автоматический тест.');
    await page.locator('select').nth(1).selectOption('Душанбе');
    await page.getByRole('button', { name: 'Опубликовать' }).click();
    await page.waitForURL(/\/tasks\/[a-z0-9]+$/);

    const task = await prisma.task.findFirstOrThrow({ where: { title } });
    expect(JSON.parse(task.images!)).toEqual([expect.stringMatching(/^\/uploads\/.+\.png$/)]);
    await expect(page.locator('img[src*="/uploads/"]').first()).toBeVisible();
});
