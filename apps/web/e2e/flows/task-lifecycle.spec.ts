import { test, expect, open, loginAs, newSession, confirmDialog } from '../support/test';
import { createUser, e2eTag, prisma } from '../support/db';

// The product's core loop, driven through the UI with a customer and a provider
// signed in side by side: post → respond → accept → chat → complete → review.
test('a task goes from posted to reviewed', async ({ page: customerPage, browser }) => {
    test.setTimeout(240_000);

    const customer = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER', { fullName: 'E2E Мастер' });
    const tag = e2eTag();
    const title = `${tag} Починить кран на кухне`;
    let taskId = '';

    await test.step('the customer posts a task', async () => {
        await loginAs(customerPage, customer);
        await open(customerPage, '/create-task');

        await customerPage.getByPlaceholder('например, Починить протекающий кран на кухне').fill(title);
        await customerPage.locator('select').nth(0).selectOption('Сантехника');
        await customerPage.getByPlaceholder('Опишите проблему или задачу подробно...')
            .fill('Течёт смеситель на кухне, нужно заменить. Автоматический тест.');
        await customerPage.locator('select').nth(1).selectOption('Душанбе');
        await customerPage.getByRole('button', { name: 'Фикс. цена' }).click();
        await customerPage.getByPlaceholder('0.00').fill('250');
        await customerPage.getByRole('button', { name: 'Опубликовать' }).click();

        await customerPage.waitForURL(/\/tasks\/[a-z0-9]+$/);
        taskId = customerPage.url().split('/').pop()!;

        const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
        expect(task).toMatchObject({
            title,
            category: 'Сантехника',
            city: 'Душанбе',
            budgetType: 'fixed',
            budgetAmountNum: 250,
            status: 'OPEN',
            userId: customer.id,
        });
        await expect(customerPage.getByText('Ожидание предложений от исполнителей')).toBeVisible();
    });

    await test.step('the task is in the public feed and searchable', async () => {
        await customerPage.goto(`/tasks?query=${encodeURIComponent(tag)}`);
        await expect(customerPage.getByRole('heading', { name: title })).toBeVisible();
    });

    const { context: providerContext, page: providerPage } = await newSession(browser, provider);

    await test.step('the provider responds with a price', async () => {
        await open(providerPage, `/tasks/${taskId}`);
        const form = providerPage.locator('form').filter({ has: providerPage.locator('[name="price"]') });
        await form.locator('[name="price"]').fill('220');
        await form.locator('[name="message"]').fill(`${tag} Сделаю сегодня, инструмент свой.`);
        await form.getByRole('button', { name: 'Отправить предложение' }).click();

        await expect(providerPage.getByText('Вы уже откликнулись на это задание')).toBeVisible();
        const response = await prisma.response.findFirstOrThrow({ where: { taskId, userId: provider.id } });
        expect(response).toMatchObject({ status: 'PENDING', priceNum: 220 });
    });

    await test.step('the customer accepts the offer', async () => {
        await open(customerPage, `/tasks/${taskId}`);
        await expect(customerPage.getByText(`${tag} Сделаю сегодня, инструмент свой.`)).toBeVisible();
        await customerPage.getByRole('button', { name: 'Принять предложение' }).click();
        await confirmDialog(customerPage);

        await expect(customerPage.getByText('Задание выполняется')).toBeVisible();
        const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
        expect(task).toMatchObject({ status: 'IN_PROGRESS', assignedUserId: provider.id });
    });

    await test.step('a task in progress leaves the public feed', async () => {
        const res = await customerPage.request.get(`/api/tasks?query=${encodeURIComponent(tag)}`);
        expect((await res.json()).tasks).toEqual([]);
    });

    await test.step('they talk it over in chat', async () => {
        await open(customerPage, `/messages?userId=${provider.id}&taskId=${taskId}`);
        await customerPage.getByPlaceholder('Введите сообщение...').fill(`${tag} Когда сможете приехать?`);
        await customerPage.getByRole('button', { name: 'Отправить', exact: true }).click();
        // The text also appears in the conversation list; the last match is the bubble.
        await expect(customerPage.getByText(`${tag} Когда сможете приехать?`).last()).toBeVisible();

        await open(providerPage, `/messages?userId=${customer.id}&taskId=${taskId}`);
        await expect(providerPage.getByText(`${tag} Когда сможете приехать?`).last()).toBeVisible();
        await providerPage.getByPlaceholder('Введите сообщение...').fill(`${tag} Буду через час.`);
        await providerPage.getByRole('button', { name: 'Отправить', exact: true }).click();
        await expect(providerPage.getByText(`${tag} Буду через час.`).last()).toBeVisible();

        expect(await prisma.message.count({ where: { taskId } })).toBe(2);
    });

    await test.step('the customer marks the task complete', async () => {
        await open(customerPage, `/tasks/${taskId}`);
        await customerPage.getByRole('button', { name: 'Отметить завершенным' }).click();
        await confirmDialog(customerPage);

        await expect(customerPage.getByText('Задание завершено')).toBeVisible();
        expect((await prisma.task.findUniqueOrThrow({ where: { id: taskId } })).status).toBe('COMPLETED');
    });

    await test.step('the customer leaves a review', async () => {
        const form = customerPage.locator('form').filter({ hasText: 'Отправить отзыв' });
        await form.locator('button[type="button"]').nth(4).click();
        await form.locator('textarea').fill(`${tag} Быстро и аккуратно.`);
        await form.getByRole('button', { name: 'Отправить отзыв' }).click();
        await expect(customerPage.getByText('Спасибо за ваш отзыв!')).toBeVisible();

        const review = await prisma.review.findUniqueOrThrow({ where: { taskId } });
        expect(review).toMatchObject({ rating: 5, reviewerId: customer.id, reviewedId: provider.id });
    });

    await test.step('the review shows on the provider\'s public profile', async () => {
        await providerPage.goto(`/provider/${provider.id}`);
        await expect(providerPage.getByText(`${tag} Быстро и аккуратно.`)).toBeVisible();
    });

    await test.step('a second review of the same task is refused', async () => {
        const res = await customerPage.request.post('/api/reviews', { data: { taskId, rating: 1, comment: 'again' } });
        expect(res.status()).toBe(400);
    });

    await providerContext.close();
});

test('the owner cancels an open task and it stops taking responses', async ({ page, browser }) => {
    const customer = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    await loginAs(page, customer);

    const created = await page.request.post('/api/tasks', {
        data: {
            title: `${e2eTag()} Убрать квартиру`,
            description: 'Генеральная уборка двухкомнатной квартиры. Автоматический тест.',
            category: 'Уборка',
            city: 'Душанбе',
            budget: 'negotiable',
            urgency: 'normal',
        },
    });
    expect(created.status(), await created.text()).toBeLessThan(300);
    const taskId: string = (await created.json()).task.id;

    await open(page, `/tasks/${taskId}`);
    await page.getByRole('button', { name: 'Отменить задание' }).click();
    await confirmDialog(page);
    await expect.poll(async () => (await prisma.task.findUniqueOrThrow({ where: { id: taskId } })).status)
        .toBe('CANCELLED');

    const { context, page: providerPage } = await newSession(browser, provider);
    const res = await providerPage.request.post('/api/responses', {
        data: { taskId, price: '100', message: 'Готов выполнить это задание сегодня.' },
    });
    expect(res.status()).toBe(409);
    expect((await res.json()).error).toBe('Это задание больше не принимает отклики');
    await context.close();
});

test('the owner rejects a response', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const task = await prisma.task.create({
        data: {
            title: `${e2eTag()} Перевезти диван`,
            description: 'Перевезти диван внутри города. Автоматический тест.',
            category: 'Доставка',
            city: 'Душанбе',
            budgetType: 'negotiable',
            userId: customer.id,
            responses: { create: { userId: provider.id, message: 'Могу завтра утром.', price: '300', priceNum: 300 } },
        },
    });

    await loginAs(page, customer);
    await open(page, `/tasks/${task.id}`);
    await page.getByRole('button', { name: 'Отклонить', exact: true }).click();
    await confirmDialog(page);

    await expect(page.getByText('ОТКЛОНЕНО')).toBeVisible();
    const response = await prisma.response.findFirstOrThrow({ where: { taskId: task.id } });
    expect(response.status).toBe('REJECTED');
    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status).toBe('OPEN');
});
