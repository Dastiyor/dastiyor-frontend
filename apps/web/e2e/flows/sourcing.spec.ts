import { test, expect, open, loginAs } from '../support/test';
import { createUser, e2eTag, prisma } from '../support/db';

// Phase 3 from the browser: a company sends a sourcing request and later sees
// the professionals the team proposed. The team's side lives in dastiyor-admin,
// so its update is written straight to the database here.

test('a company sends a request and sees the proposed professionals', async ({ page }) => {
    const tag = e2eTag();
    const company = await createUser('CUSTOMER', { fullName: `ООО ${tag}` });
    const pro = await createUser('PROVIDER', { fullName: `Предложенный ${tag}` });
    await loginAs(page, company);
    await open(page, '/sourcing');

    await page.locator('#sr-category').selectOption('Электрик');
    await page.locator('#sr-city').selectOption('Душанбе');
    await page.locator('#sr-headcount').fill('3');
    await page.locator('#sr-experience').fill('5');
    await page.locator('#sr-budget').fill('5000 сомони в месяц');
    await page.locator('#sr-description').fill(`${tag} Нужны электрики на стройку жилого комплекса, полный день.`);
    await page.locator('#sr-name').fill(`ООО ${tag}`);
    await page.locator('#sr-phone').fill('+992000123456');
    await page.getByRole('button', { name: 'Отправить запрос' }).click();

    await expect(page.getByRole('status')).toHaveText('Запрос отправлен. Мы свяжемся с вами.');
    await expect(page.getByRole('heading', { name: 'Мои запросы' })).toBeVisible();
    await expect(page.getByText('Новый')).toBeVisible();

    const saved = await prisma.sourcingRequest.findFirstOrThrow({ where: { userId: company.id } });
    expect(saved).toMatchObject({ category: 'Электрик', city: 'Душанбе', headcount: 3, experienceYears: 5, status: 'NEW' });

    // What dastiyor-admin does when the team proposes someone.
    await prisma.sourcingRequest.update({ where: { id: saved.id }, data: { status: 'PROPOSED', proposedIds: [pro.id] } });
    await open(page, '/sourcing');
    await expect(page.getByText('Кандидаты предложены')).toBeVisible();
    await page.getByRole('link', { name: pro.fullName }).click();
    await expect(page).toHaveURL(new RegExp(`/provider/${pro.id}$`));
});

test('the request form needs a signed-in user and refuses a bad request', async ({ page, request }) => {
    await page.goto('/sourcing');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fsourcing|\/login\?redirect=\/sourcing/);

    expect((await request.post('/api/sourcing', { data: {} })).status()).toBe(401);

    await loginAs(page, await createUser('CUSTOMER'));
    const bad = await page.request.post('/api/sourcing', {
        data: { category: 'Нет такой', city: 'Душанбе', headcount: 1, description: 'x'.repeat(30), contactName: 'A', contactPhone: '+992000123456' },
    });
    expect(bad.status()).toBe(400);
    expect(await prisma.sourcingRequest.count({ where: { category: 'Нет такой' } })).toBe(0);
});
