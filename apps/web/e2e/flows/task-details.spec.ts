import { test, expect, open, loginAs, newSession } from '../support/test';
import { createResponse, createTask, createUser, e2eTag, prisma } from '../support/db';

test('the customer can switch providers mid-job, and the first one goes back in the pool', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    const first = await createUser('PROVIDER');
    const second = await createUser('PROVIDER');
    const task = await createTask(customer);
    await createResponse(task.id, first);
    await createResponse(task.id, second);
    await loginAs(page, customer);
    const accept = (providerId: string) => page.request.post('/api/tasks/accept', { data: { taskId: task.id, providerId } });
    const statusOf = async (userId: string) =>
        (await prisma.response.findFirstOrThrow({ where: { taskId: task.id, userId } })).status;

    expect((await accept(first.id)).status()).toBe(200);
    expect((await accept(first.id)).status()).toBe(400);
    expect(await statusOf(second.id)).toBe('PENDING');

    expect((await accept(second.id)).status()).toBe(200);
    expect(await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({
        status: 'IN_PROGRESS',
        assignedUserId: second.id,
    });
    expect(await statusOf(first.id)).toBe('PENDING');
    expect(await statusOf(second.id)).toBe('ACCEPTED');

    // Once finished, the choice is closed.
    expect((await page.request.post('/api/tasks/complete', { data: { taskId: task.id } })).status()).toBe(200);
    expect((await accept(first.id)).status()).toBe(400);
});

test('two offers accepted at the same moment leave exactly one provider assigned', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    const providers = [await createUser('PROVIDER'), await createUser('PROVIDER')];
    const task = await createTask(customer);
    for (const provider of providers) await createResponse(task.id, provider);
    await loginAs(page, customer);

    await Promise.all(providers.map(provider =>
        page.request.post('/api/tasks/accept', { data: { taskId: task.id, providerId: provider.id } })));

    const row = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(providers.map(p => p.id)).toContain(row.assignedUserId);
    expect(await prisma.response.count({ where: { taskId: task.id, status: 'ACCEPTED' } })).toBe(1);
    expect(await prisma.response.count({
        where: { taskId: task.id, status: 'ACCEPTED', userId: row.assignedUserId! },
    })).toBe(1);
});

test('completing a fixed-price task credits the provider once, however often it is sent', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const task = await createTask(customer, { budgetAmount: '150', budgetAmountNum: 150, status: 'IN_PROGRESS', assignedUserId: provider.id });
    await createResponse(task.id, provider, 'ACCEPTED');
    await loginAs(page, customer);
    const complete = () => page.request.post('/api/tasks/complete', { data: { taskId: task.id } });

    const results = await Promise.all([complete(), complete(), complete()]);
    expect(results.filter(r => r.status() === 200)).toHaveLength(1);
    expect((await complete()).status()).toBe(400);

    expect((await prisma.user.findUniqueOrThrow({ where: { id: provider.id } })).balance).toBe(150);
    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status).toBe('COMPLETED');
});

test('a negotiable task credits nothing on completion', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const task = await createTask(customer, {
        budgetType: 'negotiable', budgetAmount: null, budgetAmountNum: null, status: 'IN_PROGRESS', assignedUserId: provider.id,
    });
    await loginAs(page, customer);

    expect((await page.request.post('/api/tasks/complete', { data: { taskId: task.id } })).status()).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: provider.id } })).balance).toBe(0);
});

test('a provider sees their own offer on a task and nobody else\'s', async ({ page, browser }) => {
    const customer = await createUser('CUSTOMER');
    const mine = await createUser('PROVIDER');
    const rival = await createUser('PROVIDER', { fullName: 'E2E Конкурент' });
    const task = await createTask(customer);
    const tag = e2eTag();
    await prisma.response.create({ data: { taskId: task.id, userId: rival.id, price: '77', priceNum: 77, message: `${tag} секретная цена конкурента` } });
    await prisma.response.create({ data: { taskId: task.id, userId: mine.id, price: '99', priceNum: 99, message: `${tag} моё предложение` } });

    await loginAs(page, mine);
    await page.goto(`/tasks/${task.id}`);
    await expect(page.getByText(`${tag} моё предложение`)).toBeVisible();
    await expect(page.getByText(`${tag} секретная цена конкурента`)).toHaveCount(0);
    expect(await page.content()).not.toContain('секретная цена конкурента');

    const own = await (await page.request.get(`/api/tasks/${task.id}/my-response`)).json();
    expect(JSON.stringify(own)).toContain('моё предложение');
    expect((await page.request.get(`/api/tasks/${task.id}/responses`)).status()).toBe(403);

    // The owner sees both; a guest sees none.
    const { context, page: ownerPage } = await newSession(browser, customer);
    const all = await (await ownerPage.request.get(`/api/tasks/${task.id}/responses`)).json();
    expect(JSON.stringify(all)).toContain('секретная цена конкурента');
    expect(JSON.stringify(all)).toContain('моё предложение');
    await context.close();

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(`/tasks/${task.id}`);
    expect(await guestPage.content()).not.toContain(tag);
    await guest.close();
});

test('a task\'s history is for the people involved in it', async ({ page, browser }) => {
    const customer = await createUser('CUSTOMER');
    const provider = await createUser('PROVIDER');
    const task = await createTask(customer, { status: 'COMPLETED', assignedUserId: provider.id });
    await loginAs(page, customer);

    const history = await (await page.request.get(`/api/tasks/${task.id}/history`)).json();
    expect(history.history.map((h: { status: string }) => h.status)).toEqual(['OPEN', 'IN_PROGRESS', 'COMPLETED']);

    const { context, page: strangerPage } = await newSession(browser, await createUser('PROVIDER'));
    expect((await strangerPage.request.get(`/api/tasks/${task.id}/history`)).status()).toBe(403);
    expect((await strangerPage.request.get('/api/tasks/no-such-task/history')).status()).toBe(404);
    await context.close();
});

test('a provider submits verification documents; a customer cannot', async ({ page, browser }) => {
    const provider = await createUser('PROVIDER');
    await loginAs(page, provider);
    const submit = (documentUrls: unknown) => page.request.post('/api/provider/verify', { data: { documentUrls } });

    expect((await submit([])).status()).toBe(400);
    expect((await submit('https://example.com/passport.jpg')).status()).toBe(400);
    expect((await submit(['http://example.com/passport.jpg', 'javascript:alert(1)', 42])).status()).toBe(400);
    expect((await submit(['https://example.com/passport.jpg', 'ftp://nope'])).status()).toBeLessThan(300);

    const row = await prisma.user.findUniqueOrThrow({ where: { id: provider.id } });
    expect(JSON.parse(row.verificationDocuments!)).toEqual(['https://example.com/passport.jpg']);
    // Submitting documents does not verify anyone; an admin does.
    expect(row.isVerified).toBe(false);
    expect(await (await page.request.get('/api/provider/verify')).json()).toMatchObject({ isVerified: false });

    const { context, page: customerPage } = await newSession(browser, await createUser('CUSTOMER'));
    const res = await customerPage.request.post('/api/provider/verify', { data: { documentUrls: ['https://example.com/a.jpg'] } });
    expect(res.status()).toBe(403);
    await context.close();
});

test('choosing a template fills in the new-task form', async ({ page }) => {
    await loginAs(page, await createUser('CUSTOMER'));
    await open(page, '/create-task/template');
    await page.locator('a.hover-card', { hasText: 'Уборка' }).first().click();

    await expect(page).toHaveURL(/\/create-task\?/);
    await expect(page.getByPlaceholder('например, Починить протекающий кран на кухне')).toHaveValue('Генеральная уборка');
    await expect(page.locator('select').nth(0)).toHaveValue('Уборка');
    await expect(page.getByPlaceholder('Опишите проблему или задачу подробно...')).toHaveValue(/профессиональная уборка/);
});

test('a half-written task survives a reload as a draft, and can be discarded', async ({ page }) => {
    await loginAs(page, await createUser('CUSTOMER'));
    const title = page.getByPlaceholder('например, Починить протекающий кран на кухне');
    await open(page, '/create-task');
    await title.fill('Черновик: починить розетку');

    await open(page, '/create-task');
    await expect(title).toHaveValue('Черновик: починить розетку');

    await page.getByRole('button', { name: 'Удалить черновик' }).click();
    await open(page, '/create-task');
    await expect(title).toHaveValue('');
});

test('a task cannot be published until the form is complete, and says what is missing', async ({ page }) => {
    const customer = await createUser('CUSTOMER');
    await loginAs(page, customer);
    await open(page, '/create-task');

    await page.getByPlaceholder('например, Починить протекающий кран на кухне').fill('abc');
    await page.getByRole('button', { name: 'Опубликовать' }).click();
    await page.waitForLoadState('networkidle');

    expect(await prisma.task.count({ where: { userId: customer.id } })).toBe(0);
    await expect(page).toHaveURL(/\/create-task$/);
});
