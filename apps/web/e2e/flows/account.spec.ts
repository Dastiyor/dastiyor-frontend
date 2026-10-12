import { test, expect, open, loginAs, newSession } from '../support/test';
import { createTask, createUser, prisma } from '../support/db';
import { randomUUID } from 'crypto';

test('a customer is kept out of the provider dashboard, and the reverse', async ({ page, browser }) => {
    await loginAs(page, await createUser('CUSTOMER'));
    await page.goto('/provider');
    await expect(page).toHaveURL(/\/access-denied$/);

    const { context, page: providerPage } = await newSession(browser, await createUser('PROVIDER'));
    await providerPage.goto('/customer');
    await expect(providerPage).toHaveURL(/\/provider$/);
    await context.close();
});

test('a Google account without a verified phone is held at phone verification', async ({ page }) => {
    const user = await createUser('CUSTOMER', { phoneVerified: false, googleId: `e2e-${randomUUID()}` });
    await loginAs(page, user);

    const me = await (await page.request.get('/api/auth/me')).json();
    expect(me.phoneVerificationRequired).toBe(true);

    await page.goto('/customer');
    await expect(page).toHaveURL(/\/verify-phone\?redirect=(%2F|\/)customer$/);
    await expect(page.getByRole('heading', { name: 'Подтвердите номер телефона' })).toBeVisible();

    const post = await page.request.post('/api/tasks', {
        data: {
            title: 'Задание без подтверждённого телефона',
            description: 'Это задание не должно быть создано. Автоматический тест.',
            category: 'Ремонт',
            city: 'Душанбе',
            budget: 'negotiable',
        },
    });
    expect(post.status()).toBe(403);
    expect((await post.json()).code).toBe('PHONE_VERIFICATION_REQUIRED');
});

test('an Apple provider without a verified phone cannot respond to tasks', async ({ page }) => {
    const task = await createTask(await createUser('CUSTOMER'));
    const provider = await createUser('PROVIDER', { phoneVerified: false, appleId: `e2e-${randomUUID()}` });
    await loginAs(page, provider);

    await page.goto('/provider');
    await expect(page).toHaveURL(/\/verify-phone\?redirect=(%2F|\/)provider$/);

    const res = await page.request.post('/api/responses', {
        data: { taskId: task.id, price: '100', message: 'Готов выполнить это задание сегодня.' },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe('PHONE_VERIFICATION_REQUIRED');
});

test('a customer edits their profile', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    await loginAs(page, customer);
    await open(page, '/customer/profile/edit');

    const name = page.locator('form input[type="text"]').first();
    await expect(name).toHaveValue(customer.fullName);
    await name.fill('E2E Новое Имя');
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByText('Профиль успешно обновлён!')).toBeVisible();
    await expect.poll(async () => (await prisma.user.findUniqueOrThrow({ where: { id: customer.id } })).fullName)
        .toBe('E2E Новое Имя');
});

test('the dashboards list a user\'s own tasks and responses only', async ({ page, browser }) => {
    const customer = await createUser('CUSTOMER');
    const other = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const mine = await createTask(customer);
    const theirs = await createTask(other);
    await prisma.response.create({
        data: { taskId: theirs.id, userId: provider.id, message: 'Могу сделать завтра.', price: '90', priceNum: 90 },
    });

    await loginAs(page, customer);
    await page.goto('/customer/my-tasks');
    await expect(page.getByText(mine.title)).toBeVisible();
    await expect(page.getByText(theirs.title)).toHaveCount(0);

    const { context, page: providerPage } = await newSession(browser, provider);
    await providerPage.goto('/provider/my-responses');
    await expect(providerPage.getByText(theirs.title)).toBeVisible();
    await expect(providerPage.getByText(mine.title)).toHaveCount(0);
    await context.close();
});

test('a user can favourite a task and find it again', async ({ page }) => {
    const owner = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const task = await createTask(owner);
    await loginAs(page, provider);

    const res = await page.request.post('/api/tasks/favorite', { data: { taskId: task.id } });
    expect(res.status()).toBeLessThan(300);
    expect(await prisma.taskFavorite.count({ where: { userId: provider.id, taskId: task.id } })).toBe(1);

    await page.goto('/favorites');
    await expect(page.getByText(task.title)).toBeVisible();
});

test('deleting an account removes the user and everything they posted', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    const task = await createTask(customer);
    await loginAs(page, customer);

    const res = await page.request.delete('/api/account');
    expect(res.status(), await res.text()).toBe(200);

    expect(await prisma.user.count({ where: { id: customer.id } })).toBe(0);
    expect(await prisma.task.count({ where: { id: task.id } })).toBe(0);
    expect((await page.request.get('/api/auth/me')).status()).toBe(401);

    const login = await page.request.post('/api/auth/login', {
        data: { identifier: customer.email, password: customer.password },
    });
    expect(login.status()).toBe(401);
});
