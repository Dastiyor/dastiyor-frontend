import { test, expect, loginAs, newSession, untranslatedKeys, useTajik } from '../support/test';
import { createResponse, createTask, createUser, e2eTag, prisma, type E2EUser } from '../support/db';
import type { Page } from '@playwright/test';

// One customer and one provider with a task in every state between them, then
// every signed-in page for each, in both languages.

type World = Awaited<ReturnType<typeof seedWorld>>;

async function seedWorld() {
    const tag = e2eTag();
    const customer = await createUser('CUSTOMER', { fullName: `Заказчик ${tag}` });
    const provider = await createUser('PROVIDER', { fullName: `Мастер ${tag}` });
    await prisma.user.update({
        where: { id: provider.id },
        data: { bio: `${tag} Опыт 10 лет.`, skills: 'Сантехника, Электрика', isVerified: true },
    });

    const open = await createTask(customer, { title: `${tag} открытое` });
    const active = await createTask(customer, { title: `${tag} в работе`, status: 'IN_PROGRESS', assignedUserId: provider.id });
    const done = await createTask(customer, { title: `${tag} завершённое`, status: 'COMPLETED', assignedUserId: provider.id });
    const cancelled = await createTask(customer, { title: `${tag} отменённое`, status: 'CANCELLED' });
    await createResponse(open.id, provider);
    await createResponse(active.id, provider, 'ACCEPTED');
    await createResponse(done.id, provider, 'ACCEPTED');
    await prisma.review.create({
        data: { taskId: done.id, reviewerId: customer.id, reviewedId: provider.id, rating: 5, comment: `${tag} отличная работа` },
    });
    await prisma.message.create({
        data: { senderId: customer.id, receiverId: provider.id, taskId: active.id, content: `${tag} когда начнёте?` },
    });
    await prisma.taskFavorite.create({ data: { userId: provider.id, taskId: open.id } });
    return { tag, customer, provider, open, active, done, cancelled };
}

type Check = { path: string; shows?: string[]; hides?: string[] };

const customerPages = (w: World): Check[] => [
    { path: '/customer', shows: [w.customer.fullName] },
    { path: '/customer/my-tasks', shows: [w.open.title, w.active.title, w.done.title, w.cancelled.title] },
    { path: `/customer/tasks/${w.open.id}`, shows: [w.open.title] },
    { path: `/customer/tasks/${w.active.id}`, shows: [w.active.title, w.provider.fullName] },
    { path: `/customer/tasks/${w.done.id}`, shows: [w.done.title] },
    { path: '/customer/messages', shows: [w.provider.fullName] },
    { path: `/customer/messages?userId=${w.provider.id}&taskId=${w.active.id}`, shows: [`${w.tag} когда начнёте?`] },
    { path: '/customer/profile', shows: [w.customer.fullName] },
    { path: '/customer/profile/edit' },
    { path: '/my-tasks', shows: [w.open.title] },
    { path: '/messages', shows: [w.provider.fullName] },
    { path: '/profile', shows: [w.customer.fullName] },
    { path: '/create-task/template' },
    { path: `/tasks/${w.done.id}`, shows: [`${w.tag} отличная работа`] },
    { path: `/provider/${w.provider.id}`, shows: [w.provider.fullName, `${w.tag} отличная работа`] },
];

const providerPages = (w: World): Check[] => [
    { path: '/provider', shows: [w.provider.fullName] },
    { path: '/provider/task-feed', hides: [w.active.title, w.done.title, w.cancelled.title] },
    { path: `/provider/tasks/${w.open.id}`, shows: [w.open.title] },
    { path: '/provider/my-responses', shows: [w.open.title, w.active.title] },
    { path: '/provider/active-tasks', shows: [w.active.title], hides: [w.done.title, w.open.title] },
    { path: '/provider/completed-tasks', shows: [w.done.title], hides: [w.active.title, w.open.title] },
    { path: '/provider/messages', shows: [w.customer.fullName] },
    { path: `/provider/messages?userId=${w.customer.id}&taskId=${w.active.id}`, shows: [`${w.tag} когда начнёте?`] },
    { path: '/provider/portfolio' },
    { path: '/provider/profile', shows: [w.provider.fullName] },
    { path: '/provider/profile/edit' },
    { path: '/favorites', shows: [w.open.title] },
    { path: `/provider/${w.provider.id}`, shows: [w.provider.fullName] },
    { path: `/reviews/${w.provider.id}`, shows: [`${w.tag} отличная работа`] },
];

async function visitAll(page: Page, checks: Check[], locale: 'ru' | 'tj') {
    let pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(`${page.url()}: ${err.message.split('\n')[0]}`));

    for (const { path, shows = [], hides = [] } of checks) {
        const where = `${locale} ${path}`;
        let response = await page.goto(path);
        await page.waitForLoadState('networkidle');
        // `next dev` compiles a route on its first hit and can swap code under a
        // page that is still hydrating. An error that is really in the page
        // happens again on a second load; one from that race does not.
        if (pageErrors.length) {
            pageErrors = [];
            response = await page.goto(path);
            await page.waitForLoadState('networkidle');
        }
        expect(pageErrors, where).toEqual([]);

        expect(response?.status(), where).toBe(200);
        expect(new URL(page.url()).pathname, `${where} was redirected`).toBe(path.split('?')[0]);
        await expect(page.locator('html'), where).toHaveAttribute('lang', locale);
        for (const text of shows) await expect(page.getByText(text).first(), `${where} shows "${text}"`).toBeVisible();
        for (const text of hides) await expect(page.getByText(text), `${where} hides "${text}"`).toHaveCount(0);
        expect(await untranslatedKeys(page), where).toEqual([]);
    }
}

let world: World;
test.beforeAll(async () => { world = await seedWorld(); });

for (const locale of ['ru', 'tj'] as const) {
    test(`every customer page works in ${locale}`, async ({ page, context, baseURL }) => {
        test.setTimeout(240_000);
        if (locale === 'tj') await useTajik(context, baseURL!);
        await loginAs(page, world.customer);
        await visitAll(page, customerPages(world), locale);
    });

    test(`every provider page works in ${locale}`, async ({ page, context, baseURL }) => {
        test.setTimeout(240_000);
        if (locale === 'tj') await useTajik(context, baseURL!);
        await loginAs(page, world.provider);
        await visitAll(page, providerPages(world), locale);
    });
}

test('the dashboards never show one user another user\'s work', async ({ browser }) => {
    const outsiderCustomer: E2EUser = await createUser('CUSTOMER');
    const outsiderProvider: E2EUser = await createUser('PROVIDER');
    const titles = [world.open.title, world.active.title, world.done.title, world.cancelled.title];

    const { context: c1, page: customerPage } = await newSession(browser, outsiderCustomer);
    for (const path of ['/customer', '/customer/my-tasks', '/customer/messages', '/my-tasks', '/messages']) {
        await customerPage.goto(path);
        for (const title of titles) await expect(customerPage.getByText(title), path).toHaveCount(0);
        await expect(customerPage.getByText(`${world.tag} когда начнёте?`), path).toHaveCount(0);
    }
    // Someone else's task in the owner's view of it.
    const foreign = await customerPage.goto(`/customer/tasks/${world.active.id}`);
    expect(await customerPage.getByText(`${world.tag} когда начнёте?`).count()).toBe(0);
    expect([200, 403, 404]).toContain(foreign?.status());
    await expect(customerPage.getByRole('button', { name: 'Отметить завершенным' })).toHaveCount(0);
    await c1.close();

    const { context: c2, page: providerPage } = await newSession(browser, outsiderProvider);
    for (const path of ['/provider/my-responses', '/provider/active-tasks', '/provider/completed-tasks', '/provider/messages', '/favorites']) {
        await providerPage.goto(path);
        for (const title of titles) await expect(providerPage.getByText(title), path).toHaveCount(0);
    }
    await c2.close();
});

test('the public list of professionals links to profiles that open', async ({ page }) => {
    await page.goto('/professionals');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    const profile = await page.goto(`/provider/${world.provider.id}`);
    expect(profile?.status()).toBe(200);
    await expect(page.getByText(world.provider.fullName).first()).toBeVisible();
    // A public profile is not a contact card.
    const html = await page.content();
    expect(html).not.toContain(world.provider.phone);
    expect(html).not.toContain(world.provider.email);

    expect((await page.goto('/provider/no-such-provider'))?.status()).toBe(404);
});
