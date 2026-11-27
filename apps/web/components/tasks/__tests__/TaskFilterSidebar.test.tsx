import { render, screen } from '@testing-library/react';
import TaskFilterSidebar, { sortByOpenTasks } from '../TaskFilterSidebar';

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
    usePathname: () => '/tasks',
    useSearchParams: () => new URLSearchParams(),
}));
jest.mock('@/lib/i18n', () => {
    const i18n = { t: (k: string) => k, tr: (v: string) => v, locale: 'ru' };
    return { useTranslation: () => i18n };
});

describe('sortByOpenTasks', () => {
    it('puts categories with tasks first, most first, keeping admin order on ties', () => {
        const counts: Record<string, number> = { 'Уборка': 2, 'Доставка': 7, 'Красота': 2 };
        expect(sortByOpenTasks(['Ремонт', 'Уборка', 'Доставка', 'Красота', 'Дизайн'], c => counts[c] ?? 0))
            .toEqual(['Доставка', 'Уборка', 'Красота', 'Ремонт', 'Дизайн']);
    });
});

describe('TaskFilterSidebar', () => {
    it('lists the admin-managed categories, busiest first, with counts', () => {
        render(
            <TaskFilterSidebar
                categories={['Ремонт', 'Новая категория', 'Уборка']}
                categoryCounts={[{ category: 'Уборка', _count: 3 }, { category: 'Новая категория', _count: 5 }]}
                totalOpenTasks={8}
            />,
        );
        const labels = screen.getAllByRole('button').map(b => b.textContent);
        expect(labels.slice(0, 4)).toEqual(['categories.allTasks8', 'Новая категория5', 'Уборка3', 'Ремонт0']);
    });
});
