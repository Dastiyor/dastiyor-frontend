/**
 * @jest-environment node
 */
import { getTaskFeed } from '../task-feed';

const findMany = jest.fn();
const favorites = jest.fn();
jest.mock('@/lib/prisma', () => ({
    prisma: {
        task: { findMany: (args: unknown) => findMany(args), count: async () => 7 },
        taskFavorite: { findMany: (args: unknown) => favorites(args) },
    },
}));

const row = (id: string) => ({
    id, title: id, category: 'Ремонт', budgetType: 'negotiable', budgetAmount: null, city: 'Душанбе',
    createdAt: new Date('2026-11-01T10:00:00Z'), description: '', urgency: 'normal',
    _count: { responses: 0 }, status: 'OPEN', featured: false,
});

beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([row('a'), row('b')]);
});

it('says nothing about favorites to a guest, and looks none up', async () => {
    const { tasks, pagination } = await getTaskFeed(new URLSearchParams('limit=6'));
    expect(tasks[0]).not.toHaveProperty('isFavorite');
    expect(favorites).not.toHaveBeenCalled();
    expect(pagination).toMatchObject({ page: 1, limit: 6, total: 7, hasMore: true });
});

it('marks the saved ones for a signed-in caller, in one query', async () => {
    favorites.mockResolvedValue([{ taskId: 'b' }]);
    const { tasks } = await getTaskFeed(new URLSearchParams(), 'u1');
    expect(tasks.map((task) => task.isFavorite)).toEqual([false, true]);
    expect(favorites).toHaveBeenCalledTimes(1);
    expect(favorites).toHaveBeenCalledWith({ where: { userId: 'u1', taskId: { in: ['a', 'b'] } }, select: { taskId: true } });
});
