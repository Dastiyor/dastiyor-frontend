import { test, expect, open, loginAs, newSession } from '../support/test';
import { createTask, createUser, prisma } from '../support/db';
import { randomUUID } from 'crypto';

// Delivery to a phone or a browser goes through Expo and the browser vendors'
// push services, which a test cannot receive from. Covered here: the in-app
// notifications every push mirrors, and that devices and browsers register.

test('each step of a task notifies the other side, in the bell and the API', async ({ page, browser }) => {
    const customer = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const rejected = await createUser('PROVIDER');
    const task = await createTask(customer);
    const offer = { taskId: task.id, price: '140', message: 'Сделаю аккуратно и в срок.' };

    await loginAs(page, customer);
    const { context, page: providerPage } = await newSession(browser, provider);
    const { context: rejectedContext, page: rejectedPage } = await newSession(browser, rejected);
    const unread = async (p: typeof page) => (await (await p.request.get('/api/notifications')).json()).unreadCount;

    expect(await unread(page)).toBe(0);
    expect((await providerPage.request.post('/api/responses', { data: offer })).status()).toBeLessThan(300);
    expect((await rejectedPage.request.post('/api/responses', { data: offer })).status()).toBeLessThan(300);
    expect(await unread(page)).toBe(2);

    await test.step('the customer sees the offers in the bell, and opening it marks them read', async () => {
        await open(page, '/');
        const bell = page.getByRole('button', { name: 'Уведомления' });
        await expect(bell).toContainText('2');
        await bell.click();
        await expect(page.getByText('Новое предложение').first()).toBeVisible();
        await expect.poll(() => unread(page)).toBe(0);
    });

    await test.step('accepting and rejecting notify the right providers', async () => {
        const response = await prisma.response.findFirstOrThrow({ where: { taskId: task.id, userId: rejected.id } });
        expect((await page.request.post('/api/responses/reject', { data: { responseId: response.id } })).status()).toBe(200);
        expect((await page.request.post('/api/tasks/accept', { data: { taskId: task.id, providerId: provider.id } })).status()).toBe(200);

        const typesFor = async (p: typeof page) =>
            (await (await p.request.get('/api/notifications')).json()).notifications.map((n: { type: string }) => n.type);
        expect(await typesFor(rejectedPage)).toEqual(['OFFER_REJECTED']);
        expect(await typesFor(providerPage)).toEqual(['OFFER_ACCEPTED']);
    });

    await test.step('completing the task notifies the provider', async () => {
        expect((await page.request.post('/api/tasks/complete', { data: { taskId: task.id } })).status()).toBe(200);
        const forProvider = await (await providerPage.request.get('/api/notifications')).json();
        expect(forProvider.unreadCount).toBe(2);
        expect(forProvider.notifications[0].type).toBe('TASK_COMPLETED');
    });

    await test.step('a notification is shown in the reader\'s current language', async () => {
        const read = async () => (await (await providerPage.request.get('/api/notifications')).json()).notifications[0].title;
        const inRussian = await read();
        await providerPage.request.put('/api/profile/locale', { data: { locale: 'tj' } });
        expect(await read()).not.toBe(inRussian);
    });

    await context.close();
    await rejectedContext.close();
});

test('a browser subscribes to push and unsubscribes', async ({ page }) => {
    const user = await createUser('PROVIDER');
    await loginAs(page, user);
    const endpoint = `https://push.e2e.invalid/${randomUUID()}`;

    const vapid = await page.request.get('/api/push/vapid-key');
    expect([200, 503]).toContain(vapid.status());

    expect((await page.request.post('/api/push/subscribe', { data: { endpoint } })).status()).toBe(400);
    const ok = await page.request.post('/api/push/subscribe', { data: { endpoint, keys: { p256dh: 'key', auth: 'auth' } } });
    expect(ok.status()).toBe(200);
    expect(await prisma.pushSubscription.count({ where: { endpoint, userId: user.id } })).toBe(1);

    expect((await page.request.delete('/api/push/subscribe', { data: { endpoint } })).status()).toBe(200);
    expect(await prisma.pushSubscription.count({ where: { endpoint } })).toBe(0);
});

test('a phone registers for push, and the token follows whoever is signed in on it', async ({ page, browser }) => {
    const first = await createUser('CUSTOMER');
    const second = await createUser('PROVIDER');
    const token = `ExponentPushToken[${randomUUID()}]`;
    await loginAs(page, first);

    expect((await page.request.post('/api/push/register-device', { data: { token: 'not-an-expo-token' } })).status()).toBe(400);
    expect((await page.request.post('/api/push/register-device', { data: { token, platform: 'ios' } })).status()).toBe(200);
    expect(await prisma.deviceToken.findUniqueOrThrow({ where: { token } })).toMatchObject({ userId: first.id, platform: 'ios' });

    // Same phone, another account signs in: one row, now theirs.
    const { context, page: secondPage } = await newSession(browser, second);
    expect((await secondPage.request.post('/api/push/register-device', { data: { token, platform: 'ios' } })).status()).toBe(200);
    expect(await prisma.deviceToken.findUniqueOrThrow({ where: { token } })).toMatchObject({ userId: second.id });

    expect((await secondPage.request.delete('/api/push/register-device', { data: { token } })).status()).toBe(200);
    expect(await prisma.deviceToken.count({ where: { token } })).toBe(0);
    await context.close();
});
