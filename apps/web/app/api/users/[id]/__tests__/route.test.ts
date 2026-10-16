/** @jest-environment node */
import { GET } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';

let mockSubscriptionsEnabled = false;
jest.mock('@/lib/features', () => ({
    get SUBSCRIPTIONS_ENABLED() { return mockSubscriptionsEnabled; },
}));

const user = {
    id: 'p1', fullName: 'Ali', avatar: null, bio: 'Plumber', skills: 'pipes', role: 'PROVIDER', createdAt: new Date(),
    experienceYears: 5, city: 'Худжанд', categories: ['Сантехника'], isVerified: true,
};
const project = { id: 'pr1', title: 'Kitchen', description: null, images: [], order: 0 };
const get = (id = 'p1') => GET(new Request(`http://localhost/api/users/${id}`), { params: Promise.resolve({ id }) });

describe('GET /api/users/[id]', () => {
    beforeEach(() => {
        mockSubscriptionsEnabled = false;
        prismaMock.user.findUnique.mockResolvedValue(user as never);
        prismaMock.task.count.mockResolvedValue(7);
        prismaMock.review.groupBy.mockResolvedValue([
            { rating: 5, _count: { rating: 2 } },
            { rating: 2, _count: { rating: 1 } },
        ] as never);
        prismaMock.review.findMany.mockResolvedValue([]);
        prismaMock.portfolioProject.findMany.mockResolvedValue([project] as never);
    });

    it('returns 404 for an unknown user', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        const res = await get('nope');
        expect(res.status).toBe(404);
        expect((await res.json()).error).toBe('Пользователь не найден');
    });

    it('includes the provider fields, counts and portfolio', async () => {
        const { user: body } = await (await get()).json();

        expect(body).toMatchObject({
            id: 'p1', experienceYears: 5, city: 'Худжанд', categories: ['Сантехника'], isVerified: true,
            completedCount: 7, reviewCount: 3, avgRating: 4, portfolio: [project], tier: null,
        });
        expect(prismaMock.portfolioProject.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: 'p1' }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        }));
    });

    it('ratingBreakdown fills missing stars with 0', async () => {
        const { user: body } = await (await get()).json();
        expect(body.ratingBreakdown).toEqual({ 1: 0, 2: 1, 3: 0, 4: 0, 5: 2 });
    });

    it('avgRating is 0 with no reviews', async () => {
        prismaMock.review.groupBy.mockResolvedValue([] as never);
        const { user: body } = await (await get()).json();
        expect(body).toMatchObject({ avgRating: 0, reviewCount: 0 });
    });

    it('excludes hidden reviews from stats and the list', async () => {
        await get();
        expect(prismaMock.review.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { reviewedId: 'p1', hidden: false } }));
        expect(prismaMock.review.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { reviewedId: 'p1', hidden: false } }));
    });

    it('includes the task title and category on each review', async () => {
        await get();
        const args = prismaMock.review.findMany.mock.calls[0][0] as any;
        expect(args.select.task).toEqual({ select: { id: true, title: true, category: true } });
    });

    it('tier null when subscriptions disabled, plan when enabled', async () => {
        mockSubscriptionsEnabled = true;
        prismaMock.subscription.findFirst.mockResolvedValue({ plan: 'premium' } as never);
        const { user: body } = await (await get()).json();
        expect(body.tier).toBe('premium');
    });

    it('returns 500 on a database error', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        prismaMock.user.findUnique.mockRejectedValue(new Error('db'));
        expect((await get()).status).toBe(500);
    });
});
