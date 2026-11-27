import { render, screen } from '@testing-library/react';
import PopularTasks from '../PopularTasks';

const findMany = jest.fn();
jest.mock('@/lib/prisma', () => ({ prisma: { task: { findMany: (args: unknown) => findMany(args) } } }));
jest.mock('@/lib/i18n/server', () => ({
    getServerTranslation: async () => ({ t: (k: string) => k, tr: (v: string) => v }),
}));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const task = (id: string, featured: boolean) => ({
    id, featured, title: `Задание ${id}`, category: 'Ремонт', city: 'Душанбе',
    budgetType: 'negotiable', budgetAmount: null, createdAt: new Date('2026-11-20T10:00:00Z'),
});

it('shows real open tasks, featured first, linked to their own pages', async () => {
    findMany.mockResolvedValue([task('a1', true), task('b2', false)]);
    render(await PopularTasks());

    expect(findMany).toHaveBeenCalledWith({
        where: { status: 'OPEN' },
        orderBy: [{ featured: 'desc' }, { featuredAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        take: 3,
    });
    expect(screen.getByText('Задание a1')).toHaveAttribute('href', '/tasks/a1');
    expect(screen.getByText('Задание b2')).toHaveAttribute('href', '/tasks/b2');
    expect(screen.getAllByText('tasks.featured')).toHaveLength(1);
});

it('shows no section, and no examples, when nothing is open', async () => {
    findMany.mockResolvedValue([]);
    expect(await PopularTasks()).toBeNull();
});

it('shows no section when the tasks cannot be read', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    findMany.mockRejectedValue(new Error('db down'));
    expect(await PopularTasks()).toBeNull();
});
