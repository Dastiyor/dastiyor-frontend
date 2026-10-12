import { test, expect, loginAs, newSession } from '../support/test';
import { createTask, createUser, e2eTag } from '../support/db';

// Who may do what. Asserted on the API because that is what both the web app
// and the mobile app are held to, whatever their own screens allow.

const validTask = () => ({
    title: `${e2eTag()} Повесить полку`,
    description: 'Повесить книжную полку на бетонную стену. Автоматический тест.',
    category: 'Ремонт',
    city: 'Душанбе',
    budget: 'fixed',
    amount: 100,
    urgency: 'normal',
});

test('only customers post tasks', async ({ page }) => {
    await loginAs(page, await createUser('PROVIDER'));
    const res = await page.request.post('/api/tasks', { data: validTask() });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe('CUSTOMER_REQUIRED');
});

test('a task needs a real title, description, category and city', async ({ page }) => {
    await loginAs(page, await createUser('CUSTOMER'));
    const post = (patch: object) => page.request.post('/api/tasks', { data: { ...validTask(), ...patch } });

    expect((await post({ title: 'abc' })).status()).toBe(400);
    expect((await post({ description: 'коротко' })).status()).toBe(400);
    expect((await post({ category: 'Нет такой категории' })).status()).toBe(400);
    expect((await post({ city: 'Атлантида' })).status()).toBe(400);
    expect((await post({ urgency: 'yesterday' })).status()).toBe(400);
});

test('every category the picker offers is accepted when posting', async ({ page }) => {
    await loginAs(page, await createUser('CUSTOMER'));
    const config = await (await page.request.get('/api/config')).json();
    const categories: string[] = config.categories.map((c: { name: string } | string) =>
        typeof c === 'string' ? c : c.name);

    for (const category of categories) {
        const res = await page.request.post('/api/tasks', { data: { ...validTask(), category } });
        expect(res.status(), `category "${category}"`).toBeLessThan(300);
    }
});

test('markup in a task is stored as text, not as HTML', async ({ page }) => {
    await loginAs(page, await createUser('CUSTOMER'));
    const tag = e2eTag();
    const res = await page.request.post('/api/tasks', {
        data: { ...validTask(), title: `${tag} <img src=x onerror=alert(1)> полка` },
    });

    if (res.status() < 300) {
        const { task } = await res.json();
        const dialogs: string[] = [];
        page.on('dialog', d => { dialogs.push(d.message()); void d.dismiss(); });
        await page.goto(`/tasks/${task.id}`);
        await expect(page.getByText(tag).first()).toBeVisible();
        expect(await page.locator('img[src="x"]').count()).toBe(0);
        expect(dialogs).toEqual([]);
    } else {
        expect(res.status()).toBe(400);
    }
});

test('only providers respond, once, and never to their own or a missing task', async ({ page, browser }) => {
    const customer = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const task = await createTask(customer);
    const offer = { taskId: task.id, price: '120', message: 'Готов выполнить это задание сегодня.' };

    await loginAs(page, customer);
    const asCustomer = await page.request.post('/api/responses', { data: offer });
    expect(asCustomer.status()).toBe(403);
    expect((await asCustomer.json()).code).toBe('PROVIDER_REQUIRED');

    const { context, page: providerPage } = await newSession(browser, provider);
    expect((await providerPage.request.post('/api/responses', { data: offer })).status()).toBeLessThan(300);

    const again = await providerPage.request.post('/api/responses', { data: offer });
    expect((await again.json()).code).toBe('DUPLICATE_RESPONSE');

    const missing = await providerPage.request.post('/api/responses', { data: { ...offer, taskId: 'no-such-task' } });
    expect(missing.status()).toBe(404);

    const empty = await providerPage.request.post('/api/responses', { data: { taskId: task.id } });
    expect(empty.status()).toBe(400);
    await context.close();
});

test('nobody but the owner can accept, complete, cancel or review a task', async ({ page, browser }) => {
    const owner = await createUser('CUSTOMER');
    const stranger = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const task = await createTask(owner);

    await loginAs(page, stranger);
    const post = (path: string, data: object) => page.request.post(path, { data });
    expect((await post('/api/tasks/accept', { taskId: task.id, providerId: provider.id })).status()).toBe(403);
    expect((await post('/api/tasks/cancel', { taskId: task.id })).status()).toBe(403);
    expect((await post('/api/tasks/complete', { taskId: task.id })).status()).toBe(403);
    expect((await post('/api/reviews', { taskId: task.id, rating: 5 })).status()).toBe(403);

    // The provider cannot assign the task to themselves either.
    const { context, page: providerPage } = await newSession(browser, provider);
    const selfAccept = await providerPage.request.post('/api/tasks/accept', {
        data: { taskId: task.id, providerId: provider.id },
    });
    expect(selfAccept.status()).toBe(403);
    await context.close();
});

test('the owner cannot accept a provider who never responded, or review before completion', async ({ page }) => {
    const owner = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const task = await createTask(owner);
    await loginAs(page, owner);

    const accept = await page.request.post('/api/tasks/accept', { data: { taskId: task.id, providerId: provider.id } });
    expect(accept.status()).toBe(400);
    const complete = await page.request.post('/api/tasks/complete', { data: { taskId: task.id } });
    expect(complete.status()).toBe(400);
    const review = await page.request.post('/api/reviews', { data: { taskId: task.id, rating: 5 } });
    expect(review.status()).toBe(400);
});

test('chat about a task is closed to people who are not part of it', async ({ page, browser }) => {
    const owner = await createUser('CUSTOMER');
    const outsider = await createUser('PROVIDER');
    const task = await createTask(owner);

    const { context, page: outsiderPage } = await newSession(browser, outsider);
    const res = await outsiderPage.request.post('/api/messages', {
        data: { receiverId: owner.id, taskId: task.id, content: 'Здравствуйте' },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe('TASK_PARTICIPANT_REQUIRED');
    await context.close();

    await loginAs(page, owner);
    const toSelf = await page.request.post('/api/messages', { data: { receiverId: owner.id, content: 'себе' } });
    expect(toSelf.status()).toBe(400);
});
