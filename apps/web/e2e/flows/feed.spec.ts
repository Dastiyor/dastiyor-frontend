import { test, expect } from '../support/test';
import { createTask, createUser, e2eTag, type E2EUser } from '../support/db';

// The feed is shared with every other test, so each test tags its own tasks and
// searches by the tag; filters are then asserted within that set.

type FeedTask = { id: string; title: string; budgetType: string; urgency: string; city: string; category: string };

async function seedFeed(owner: E2EUser, tag: string) {
    // Explicit, spaced-out creation times: "newest first" is then a fact about
    // the data, not about how fast a local database answers.
    let minutesAgo = 10;
    const make = (title: string, data: Parameters<typeof createTask>[1]) =>
        createTask(owner, { title: `${tag} ${title}`, createdAt: new Date(Date.now() - minutesAgo-- * 60_000), ...data });
    return {
        cheap: await make('дешёвое', { budgetAmount: '50', budgetAmountNum: 50, category: 'Уборка', city: 'Душанбе', urgency: 'low' }),
        mid: await make('среднее', { budgetAmount: '300', budgetAmountNum: 300, category: 'Ремонт', city: 'Худжанд', urgency: 'normal' }),
        dear: await make('дорогое', { budgetAmount: '900', budgetAmountNum: 900, category: 'Ремонт', city: 'Душанбе', urgency: 'urgent' }),
        open: await make('договорное', { budgetType: 'negotiable', budgetAmount: null, budgetAmountNum: null, category: 'Доставка', city: 'Душанбе', urgency: 'normal' }),
        taken: await make('в работе', { status: 'IN_PROGRESS' }),
        done: await make('завершено', { status: 'COMPLETED' }),
        cancelled: await make('отменено', { status: 'CANCELLED' }),
    };
}

test.describe('the task feed', () => {
    let tag: string;
    let tasks: Awaited<ReturnType<typeof seedFeed>>;

    test.beforeAll(async () => {
        tag = e2eTag();
        tasks = await seedFeed(await createUser('CUSTOMER'), tag);
    });

    const titles = (list: FeedTask[]) => list.map(t => t.title.replace(`${tag} `, ''));
    const feed = async (request: import('@playwright/test').APIRequestContext, params = '') =>
        (await (await request.get(`/api/tasks?query=${encodeURIComponent(tag)}${params}`)).json()) as
            { tasks: FeedTask[]; pagination: { total: number; totalPages: number; hasMore: boolean } };

    test('lists open tasks only', async ({ request }) => {
        const { tasks: list, pagination } = await feed(request);
        expect(titles(list).sort()).toEqual(['дешёвое', 'договорное', 'дорогое', 'среднее']);
        expect(pagination.total).toBe(4);
    });

    test('filters by category, city and urgency', async ({ request }) => {
        expect(titles((await feed(request, `&category=${encodeURIComponent('Ремонт')}`)).tasks).sort()).toEqual(['дорогое', 'среднее']);
        expect(titles((await feed(request, `&city=${encodeURIComponent('Худжанд')}`)).tasks)).toEqual(['среднее']);
        expect(titles((await feed(request, '&urgency=urgent')).tasks)).toEqual(['дорогое']);
        expect(titles((await feed(request, '&urgency=urgent,low')).tasks).sort()).toEqual(['дешёвое', 'дорогое']);
        expect((await feed(request, `&category=${encodeURIComponent('Уборка')}&city=${encodeURIComponent('Худжанд')}`)).tasks).toEqual([]);
    });

    test('a budget range keeps negotiable tasks and drops fixed ones outside it', async ({ request }) => {
        expect(titles((await feed(request, '&minBudget=100&maxBudget=500')).tasks).sort()).toEqual(['договорное', 'среднее']);
        expect(titles((await feed(request, '&minBudget=800')).tasks).sort()).toEqual(['договорное', 'дорогое']);
        expect(titles((await feed(request, '&maxBudget=60')).tasks).sort()).toEqual(['дешёвое', 'договорное']);
    });

    test('sorts by budget in both directions, negotiable last', async ({ request }) => {
        expect(titles((await feed(request, '&sort=budget-high')).tasks)).toEqual(['дорогое', 'среднее', 'дешёвое', 'договорное']);
        expect(titles((await feed(request, '&sort=budget-low')).tasks)).toEqual(['дешёвое', 'среднее', 'дорогое', 'договорное']);
        // Newest first by default: the order they were created in, reversed.
        expect(titles((await feed(request)).tasks)).toEqual(['договорное', 'дорогое', 'среднее', 'дешёвое']);
    });

    test('pages through results without repeating or losing a task', async ({ request }) => {
        const first = await feed(request, '&limit=3&page=1');
        const second = await feed(request, '&limit=3&page=2');
        expect(first.tasks).toHaveLength(3);
        expect(first.pagination).toMatchObject({ total: 4, totalPages: 2, hasMore: true });
        expect(second.tasks).toHaveLength(1);
        expect(second.pagination.hasMore).toBe(false);
        expect(new Set([...first.tasks, ...second.tasks].map(t => t.id)).size).toBe(4);

        // Out-of-range and junk paging values degrade to something sane.
        expect((await feed(request, '&page=99')).tasks).toEqual([]);
        for (const junk of ['&page=-5&limit=abc', '&page=abc', '&limit=0', '&minBudget=abc&maxBudget=xyz', '&limit=100000']) {
            const res = await request.get(`/api/tasks?query=${encodeURIComponent(tag)}${junk}`);
            expect(res.status(), junk).toBe(200);
            const count = (await res.json()).tasks.length;
            expect(count, junk).toBeGreaterThan(0);
            expect(count, junk).toBeLessThanOrEqual(50);
        }
    });

    test('the search endpoint finds by word and needs at least two characters', async ({ request }) => {
        const found = await request.get(`/api/tasks/search?q=${encodeURIComponent(tag)}`);
        expect(found.status()).toBe(200);
        expect(JSON.stringify(await found.json())).toContain(tasks.cheap.id);
        expect(JSON.stringify(await found.json())).not.toContain(tasks.done.id);

        expect((await request.get('/api/tasks/search?q=a')).status()).toBe(400);
        expect((await request.get('/api/tasks/search')).status()).toBe(400);
    });

    test('a search with quotes, wildcards or SQL in it is just a search', async ({ request }) => {
        for (const query of [`' OR 1=1 --`, '%', '_', '"; DROP TABLE "Task"; --', '<script>alert(1)</script>', '\\']) {
            const res = await request.get(`/api/tasks?query=${encodeURIComponent(query)}&limit=5`);
            expect(res.status(), query).toBe(200);
        }
        // The table is still there.
        expect((await feed(request)).pagination.total).toBe(4);
    });

    test('the filters work from the page, and the address bar carries them', async ({ page }) => {
        await page.goto(`/tasks?query=${encodeURIComponent(tag)}`);
        await expect(page.getByRole('heading', { name: `${tag} дорогое` })).toBeVisible();
        await page.waitForLoadState('networkidle');

        await page.locator('aside, div').getByRole('button', { name: /Уборка/ }).first().click();
        await expect(page).toHaveURL(/category=/);
        await expect(page.getByRole('heading', { name: `${tag} дешёвое` })).toBeVisible();
        await expect(page.getByRole('heading', { name: `${tag} дорогое` })).toHaveCount(0);

        // A filtered URL can be shared: loading it fresh shows the same list.
        await page.goto(page.url());
        await expect(page.getByRole('heading', { name: `${tag} дешёвое` })).toBeVisible();
        await expect(page.getByRole('heading', { name: `${tag} среднее` })).toHaveCount(0);
    });

    test('closed tasks are still reachable by their link, marked as closed', async ({ page }) => {
        await page.goto(`/tasks/${tasks.cancelled.id}`);
        await expect(page.getByRole('heading', { name: `${tag} отменено` }).first()).toBeVisible();
        await expect(page.getByText('ОТМЕНЕНО').first()).toBeVisible();
        await expect(page.getByRole('link', { name: 'Войдите, чтобы откликнуться' })).toHaveCount(0);
    });

    test('the public task endpoint shows the poster\'s name but no way to contact them', async ({ request }) => {
        const body = await (await request.get(`/api/tasks/${tasks.cheap.id}`)).json();
        expect(body.customer).toEqual({ id: expect.any(String), fullName: expect.any(String), avatar: null });
        expect(JSON.stringify(body)).not.toMatch(/"(phone|email|password)"/);
        expect((await request.get('/api/tasks/no-such-task')).status()).toBe(404);
    });
});
