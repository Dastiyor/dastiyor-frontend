import { test, expect, open, loginAs, newSession } from '../support/test';
import { createResponse, createTask, createUser, e2eTag, prisma } from '../support/db';

test('a conversation shows up in both inboxes, with the latest message and what is unread', async ({ page, browser }) => {
    const customer = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER', { fullName: 'E2E Собеседник' });
    const task = await createTask(customer);
    await createResponse(task.id, provider);
    const tag = e2eTag();

    await loginAs(page, customer);
    const { context, page: providerPage } = await newSession(browser, provider);
    const send = (p: typeof page, receiverId: string, content: string) =>
        p.request.post('/api/messages', { data: { receiverId, taskId: task.id, content } });

    expect((await send(page, provider.id, `${tag} первое`)).status()).toBeLessThan(300);
    expect((await send(page, provider.id, `${tag} второе`)).status()).toBeLessThan(300);

    const inbox = await (await providerPage.request.get('/api/conversations')).json();
    expect(JSON.stringify(inbox)).toContain(`${tag} второе`);
    expect(JSON.stringify(inbox)).toContain(customer.id);
    expect(await prisma.message.count({ where: { receiverId: provider.id, isRead: false } })).toBe(2);

    // Opening the thread reads it.
    await open(providerPage, `/provider/messages?userId=${customer.id}&taskId=${task.id}`);
    await expect(providerPage.getByText(`${tag} первое`).last()).toBeVisible();
    await expect(providerPage.getByText(`${tag} второе`).last()).toBeVisible();
    await expect.poll(() => prisma.message.count({ where: { receiverId: provider.id, isRead: false } })).toBe(0);

    // Messages come back oldest first.
    const thread = await (await providerPage.request.get(`/api/messages?userId=${customer.id}&taskId=${task.id}`)).json();
    expect(thread.messages.map((m: { content: string }) => m.content)).toEqual([`${tag} первое`, `${tag} второе`]);
    await context.close();
});

test('deleting a chat removes it for you and leaves it for the other person', async ({ page, browser }) => {
    const customer = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const task = await createTask(customer);
    await createResponse(task.id, provider);
    const tag = e2eTag();

    await loginAs(page, customer);
    const { context, page: providerPage } = await newSession(browser, provider);
    await page.request.post('/api/messages', { data: { receiverId: provider.id, taskId: task.id, content: `${tag} привет` } });
    await providerPage.request.post('/api/messages', { data: { receiverId: customer.id, taskId: task.id, content: `${tag} здравствуйте` } });

    const thread = (p: typeof page, other: string) =>
        p.request.get(`/api/messages?userId=${other}&taskId=${task.id}`).then(r => r.json()).then(b => b.messages.length);

    const removed = await page.request.delete(`/api/conversations?userId=${provider.id}&taskId=${task.id}`);
    expect(removed.status()).toBe(200);
    expect(await thread(page, provider.id)).toBe(0);
    expect(await thread(providerPage, customer.id)).toBe(2);

    // A new message starts the thread again for the one who deleted it.
    await providerPage.request.post('/api/messages', { data: { receiverId: customer.id, taskId: task.id, content: `${tag} вы тут?` } });
    expect(await thread(page, provider.id)).toBe(1);

    expect((await page.request.delete(`/api/conversations?userId=${customer.id}`)).status()).toBe(400);
    expect((await page.request.delete('/api/conversations')).status()).toBe(400);
    await context.close();
});

test('nobody can read a conversation they are not in', async ({ page, browser }) => {
    const customer = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const task = await createTask(customer);
    await createResponse(task.id, provider);
    const tag = e2eTag();

    await loginAs(page, customer);
    await page.request.post('/api/messages', { data: { receiverId: provider.id, taskId: task.id, content: `${tag} адрес: ул. Рудаки 1` } });

    const { context, page: snoop } = await newSession(browser, await createUser('PROVIDER'));
    for (const other of [customer.id, provider.id]) {
        const res = await snoop.request.get(`/api/messages?userId=${other}&taskId=${task.id}`);
        expect(JSON.stringify(await res.json())).not.toContain(tag);
    }
    expect(JSON.stringify(await (await snoop.request.get('/api/conversations')).json())).not.toContain(tag);
    await context.close();
});

test('what can and cannot be sent', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const task = await createTask(customer);
    await createResponse(task.id, provider);
    await loginAs(page, customer);
    const send = (data: object) => page.request.post('/api/messages', { data: { receiverId: provider.id, taskId: task.id, ...data } });

    expect((await send({ content: '   ' })).status()).toBe(400);
    expect((await send({})).status()).toBe(400);
    expect((await send({ content: 'я'.repeat(2001) })).status()).toBe(400);
    expect((await send({ content: 'я'.repeat(2000) })).status()).toBeLessThan(300);
    expect((await send({ imageUrl: 'javascript:alert(1)' })).status()).toBe(400);
    expect((await send({ imageUrl: 'http://evil.example/track.gif' })).status()).toBe(400);
    expect((await page.request.post('/api/messages', { data: { receiverId: 'no-such-user', content: 'привет' } })).status()).toBe(404);
    expect((await page.request.post('/api/messages', { data: { receiverId: provider.id, taskId: 'no-such-task', content: 'привет' } })).status()).toBe(404);
    expect((await page.request.post('/api/messages', { data: { content: 'привет' } })).status()).toBe(400);
});

test('markup in a message is shown as text', async ({ page, browser }) => {
    const customer = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const task = await createTask(customer);
    await createResponse(task.id, provider);
    const tag = e2eTag();

    await loginAs(page, customer);
    await page.request.post('/api/messages', {
        data: { receiverId: provider.id, taskId: task.id, content: `${tag} <img src=x onerror=alert(1)><b>жирный</b>` },
    });

    const { context, page: providerPage } = await newSession(browser, provider);
    const dialogs: string[] = [];
    providerPage.on('dialog', d => { dialogs.push(d.message()); void d.dismiss(); });
    await open(providerPage, `/provider/messages?userId=${customer.id}&taskId=${task.id}`);
    await expect(providerPage.getByText(tag).last()).toBeVisible();
    expect(await providerPage.locator('img[src="x"]').count()).toBe(0);
    expect(dialogs).toEqual([]);
    await context.close();
});
