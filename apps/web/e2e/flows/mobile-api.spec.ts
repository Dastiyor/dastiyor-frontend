import { test, expect, mobileSession } from '../support/test';
import { createUser, e2eTag, prisma } from '../support/db';

// The mobile app has no server of its own: it calls these same routes with a
// Bearer token. Playwright cannot drive the native screens, so this walks the
// app's whole journey the way the app makes it — phone login, no cookies — and
// checks the fields its screens read. The screens themselves are not covered.

test('the app\'s journey: post, respond, accept, chat, complete, review', async ({ baseURL }) => {
    const customerUser = await createUser('CUSTOMER');
    const providerUser = await createUser('PROVIDER', { fullName: 'E2E Мобильный Мастер' });
    const customer = await mobileSession(baseURL!, customerUser);
    const provider = await mobileSession(baseURL!, providerUser);
    const tag = e2eTag();
    let taskId = '';

    await test.step('start-up: who am I, and the pickers', async () => {
        const me = await (await customer.get('/api/auth/me')).json();
        expect(me).toMatchObject({
            id: customerUser.id,
            role: 'CUSTOMER',
            phone: customerUser.phone,
            phoneVerified: true,
            phoneVerificationRequired: false,
        });
        expect(me).not.toHaveProperty('password');

        const config = await (await customer.get('/api/config')).json();
        expect(config.categories.length).toBeGreaterThan(0);
        expect(config.cities.length).toBeGreaterThan(0);
    });

    await test.step('the customer posts a task', async () => {
        const res = await customer.post('/api/tasks', {
            data: {
                title: `${tag} Настроить роутер`,
                description: 'Настроить Wi-Fi роутер и подключить телевизор. Автоматический тест.',
                category: 'Ремонт',
                city: 'Душанбе',
                budget: 'fixed',
                amount: 80,
                urgency: 'urgent',
            },
        });
        expect(res.status(), await res.text()).toBeLessThan(300);
        taskId = (await res.json()).task.id;

        const mine = await (await customer.get('/api/my-tasks')).json();
        expect(JSON.stringify(mine)).toContain(taskId);
    });

    await test.step('the provider finds it in the feed and opens it', async () => {
        const feed = await (await provider.get(`/api/tasks?query=${encodeURIComponent(tag)}`)).json();
        expect(feed.tasks).toHaveLength(1);
        expect(feed.tasks[0]).toMatchObject({
            id: taskId,
            category: 'Ремонт',
            city: 'Душанбе',
            urgency: 'urgent',
            status: 'OPEN',
            responseCount: 0,
        });
        expect(feed.pagination).toMatchObject({ page: 1, total: 1 });

        const detail = await provider.get(`/api/tasks/${taskId}`);
        expect(detail.status()).toBe(200);
        expect(JSON.stringify(await detail.json())).toContain(`${tag} Настроить роутер`);
    });

    await test.step('the provider responds', async () => {
        const res = await provider.post('/api/responses', {
            data: { taskId, price: '75', message: `${tag} Приеду в течение часа.`, estimatedTime: '1 час' },
        });
        expect(res.status(), await res.text()).toBeLessThan(300);

        const mine = await (await provider.get('/api/my-responses')).json();
        expect(JSON.stringify(mine)).toContain(taskId);
    });

    await test.step('the customer is notified and accepts', async () => {
        const inbox = await (await customer.get('/api/notifications')).json();
        expect(inbox.unreadCount).toBe(1);
        expect((await customer.put('/api/notifications')).status()).toBe(200);

        const profile = await (await customer.get(`/api/users/${providerUser.id}`)).json();
        expect(profile.user).toMatchObject({ id: providerUser.id, fullName: providerUser.fullName, role: 'PROVIDER' });
        expect(profile.user).not.toHaveProperty('phone');
        expect(profile.user).not.toHaveProperty('email');

        const res = await customer.post('/api/tasks/accept', { data: { taskId, providerId: providerUser.id } });
        expect(res.status(), await res.text()).toBe(200);
    });

    await test.step('they exchange messages', async () => {
        const sent = await customer.post('/api/messages', {
            data: { receiverId: providerUser.id, taskId, content: `${tag} Жду вас.` },
        });
        expect(sent.status(), await sent.text()).toBeLessThan(300);

        const thread = await provider.get(`/api/messages?userId=${customerUser.id}&taskId=${taskId}`);
        expect(JSON.stringify(await thread.json())).toContain(`${tag} Жду вас.`);
        const conversations = await provider.get('/api/conversations');
        expect(JSON.stringify(await conversations.json())).toContain(customerUser.id);
    });

    await test.step('the customer completes and reviews', async () => {
        expect((await customer.post('/api/tasks/complete', { data: { taskId } })).status()).toBe(200);
        const review = await customer.post('/api/reviews', { data: { taskId, rating: 4, comment: `${tag} Хорошо.` } });
        expect(review.status(), await review.text()).toBeLessThan(300);

        const profile = await (await provider.get(`/api/users/${providerUser.id}`)).json();
        expect(profile.user).toMatchObject({ completedCount: 1, avgRating: 4, reviewCount: 1 });
    });

    await customer.dispose();
    await provider.dispose();
});

test('profile, language and push registration from the app', async ({ baseURL }) => {
    const user = await createUser('PROVIDER');
    const app = await mobileSession(baseURL!, user);

    const update = await app.put('/api/profile', {
        data: { fullName: 'E2E Обновлённый', bio: 'Сантехник, 10 лет опыта.', skills: 'Сантехника, Электрика' },
    });
    expect(update.status(), await update.text()).toBe(200);
    expect((await app.put('/api/profile', { data: { fullName: 'A' } })).status()).toBe(400);

    expect((await app.put('/api/profile/locale', { data: { locale: 'tj' } })).status()).toBe(200);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row).toMatchObject({ fullName: 'E2E Обновлённый', locale: 'tj', skills: 'Сантехника, Электрика' });

    const push = await app.post('/api/push/register-device', {
        data: { token: `ExponentPushToken[${user.id}]`, platform: 'android' },
    });
    expect(push.status()).toBe(200);
    await app.dispose();
});

test('logging out in the app kills its token', async ({ baseURL }) => {
    const app = await mobileSession(baseURL!, await createUser('CUSTOMER'));
    expect((await app.get('/api/auth/me')).status()).toBe(200);

    expect((await app.post('/api/auth/logout')).status()).toBe(200);
    expect((await app.get('/api/profile')).status()).toBe(401);
    expect((await app.get('/api/my-tasks')).status()).toBe(401);
    await app.dispose();
});

test('errors reach the app as the Russian text its translations are keyed on', async ({ baseURL, request }) => {
    const wrong = await request.post('/api/auth/login', {
        data: { identifier: '+992000000001', password: 'Wrong-Passw0rd!' },
    });
    expect(await wrong.json()).toEqual({ error: 'Неверный логин или пароль' });

    const app = await mobileSession(baseURL!, await createUser('PROVIDER'));
    const post = await app.post('/api/tasks', { data: {} });
    expect(await post.json()).toMatchObject({ error: 'Публиковать задания могут только заказчики', code: 'CUSTOMER_REQUIRED' });
    await app.dispose();
});
