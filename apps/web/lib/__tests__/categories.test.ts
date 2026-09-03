jest.mock('@/lib/prisma', () => ({
    prisma: { category: { findMany: jest.fn() } },
}));

import { getCategories } from '@/lib/categories';
import { CATEGORIES } from '@/lib/config-fallback';
import { prisma } from '@/lib/prisma';

const findMany = prisma.category.findMany as jest.Mock;

describe('getCategories', () => {
    beforeEach(() => jest.clearAllMocks());

    it('serves admin-managed names in the order the admin set', async () => {
        findMany.mockResolvedValue([
            { name: 'Уборка' },
            { name: 'Ремонт' },
            { name: 'Выгул собак' },
        ]);

        await expect(getCategories()).resolves.toEqual(['Уборка', 'Ремонт', 'Выгул собак']);
        expect(findMany).toHaveBeenCalledWith({
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            select: { name: true },
        });
    });

    it('falls back to the built-in list when the table is empty', async () => {
        findMany.mockResolvedValue([]);
        await expect(getCategories()).resolves.toEqual(CATEGORIES);
    });

    it('falls back to the built-in list when the DB is unreachable', async () => {
        findMany.mockRejectedValue(new Error('connection refused'));
        await expect(getCategories()).resolves.toEqual(CATEGORIES);
    });

    // The reason getCategories exists: the picker and the task-creation
    // allow-list must agree, or the form offers a category the API rejects.
    it('accepts a DB-only category that is absent from the fallback list', async () => {
        findMany.mockResolvedValue([{ name: 'Выгул собак' }]);

        const live = await getCategories();

        expect(live).toContain('Выгул собак');
        expect(CATEGORIES).not.toContain('Выгул собак');
    });
});
