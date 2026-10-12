import { test, expect } from '../support/test';
import { E2E_SEED_TASK } from '../support/env';

type ConfigResponse = { categories: Array<{ name: string } | string>; cities: string[] };
type TaskSummary = { id: string; title: string; category: string; city: string; status: string };

const nameOf = (c: { name: string } | string) => (typeof c === 'string' ? c : c.name);

test('config serves categories and cities in canonical Russian', async ({ request }) => {
    const config: ConfigResponse = await (await request.get('/api/config')).json();
    expect(config.categories.length).toBeGreaterThan(0);
    expect(config.cities).toContain('Душанбе');
    for (const c of config.categories) expect(nameOf(c)).toMatch(/[А-Яа-яЁё]/);
});

test('the task list page shows the feed and its filters', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Найти задания' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Категория' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Город' })).toBeVisible();
});

test('the public task API only lists open tasks and pages them', async ({ request }) => {
    const res = await request.get('/api/tasks?limit=5');
    expect(res.status()).toBe(200);
    const body: { tasks: TaskSummary[]; pagination: { total: number; limit: number } } = await res.json();
    expect(body.tasks.length).toBeLessThanOrEqual(5);
    expect(body.pagination.limit).toBe(5);
    for (const t of body.tasks) expect(t.status).toBe('OPEN');
});

test('the public task API does not leak contact details', async ({ request }) => {
    const text = await (await request.get('/api/tasks?limit=20')).text();
    expect(text).not.toMatch(/"(phone|email|password|address)"\s*:/);
});

test('a search with no matches shows an empty state rather than an error', async ({ page }) => {
    const response = await page.goto('/tasks?query=zzz-no-such-task-qqq');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Найти задания' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Подробнее' })).toHaveCount(0);
});

test.describe('with at least one open task', () => {
    let task: TaskSummary;

    test.beforeEach(async ({ request }) => {
        // Prefer the seeded task when there is one: on a run that also writes,
        // any other open task may be accepted or cancelled under us.
        const find = async (query: string): Promise<TaskSummary[]> =>
            (await (await request.get(`/api/tasks?limit=1${query}`)).json()).tasks;
        const [found] = [...await find(`&query=${encodeURIComponent(E2E_SEED_TASK)}`), ...await find('')];
        test.skip(!found, 'no open tasks in this database');
        task = found;
    });

    test('filtering by category narrows the list', async ({ page }) => {
        await page.goto(`/tasks?category=${encodeURIComponent(task.category)}`);
        await expect(page.getByRole('heading', { name: task.title }).first()).toBeVisible();

        await page.goto(`/tasks?category=${encodeURIComponent(task.category)}&query=zzz-no-such-task-qqq`);
        await expect(page.getByRole('heading', { name: task.title })).toHaveCount(0);
    });

    test('filtering by city narrows the list', async ({ page }) => {
        await page.goto(`/tasks?city=${encodeURIComponent(task.city)}`);
        await expect(page.getByRole('heading', { name: task.title }).first()).toBeVisible();
    });

    test('a guest can open a task but has to sign in to respond', async ({ page }) => {
        await page.goto(`/tasks/${task.id}`);
        await expect(page.getByRole('heading', { name: task.title }).first()).toBeVisible();

        const cta = page.getByRole('link', { name: 'Войдите, чтобы откликнуться' });
        await expect(cta).toHaveAttribute('href', `/login?redirect=${encodeURIComponent(`/tasks/${task.id}`)}`);
        await expect(page.getByRole('button', { name: 'Отправить предложение' })).toHaveCount(0);
    });

    test('a task card opens the task', async ({ page }) => {
        await page.goto(`/tasks?query=${encodeURIComponent(task.title)}`);
        await page.getByRole('link', { name: 'Подробнее' }).first().click();
        await expect(page).toHaveURL(/\/tasks\/[a-z0-9]+$/);
    });
});

test('a task that does not exist is a 404', async ({ page }) => {
    const response = await page.goto('/tasks/does-not-exist-000');
    expect(response?.status()).toBe(404);
});
