/** @jest-environment node */
import { prismaMock } from '../../__tests__/mocks/prisma';
import { getRecommendedProviders } from '../recommended-providers';
import { searchProfessionals } from '@/lib/professionals';
import type { ProfessionalCard, SubscriptionTier } from '@dastiyor/types';

jest.mock('@/lib/professionals', () => ({ searchProfessionals: jest.fn() }));
const search = searchProfessionals as jest.Mock;

const pro = (id: string, city = 'Душанбе', tier: SubscriptionTier | null = null): ProfessionalCard => ({
    id, fullName: id, avatar: null, city, categories: ['Ремонт'], experienceYears: null,
    isVerified: false, avgRating: null, reviewCount: 0, completedCount: 0, tier,
});
const page = (items: ProfessionalCard[]) => ({ items, total: items.length, page: 1, limit: 20 });
const task = { id: 't1', userId: 'author', category: 'Ремонт', city: 'Душанбе' };
const ids = (list: ProfessionalCard[]) => list.map((p) => p.id);

describe('getRecommendedProviders', () => {
    beforeEach(() => {
        search.mockReset();
        prismaMock.response.findMany.mockResolvedValue([] as never);
    });

    it('fills from the task city only when it has six', async () => {
        search.mockResolvedValueOnce(page(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((i) => pro(i))));

        const res = await getRecommendedProviders(task);

        expect(ids(res)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
        expect(search).toHaveBeenCalledTimes(1);
        expect(search).toHaveBeenCalledWith({ category: 'Ремонт', city: 'Душанбе', limit: 7 });
    });

    it('tops up from other cities, without repeating anyone', async () => {
        search
            .mockResolvedValueOnce(page([pro('a'), pro('b')]))
            .mockResolvedValueOnce(page([pro('a'), pro('x', 'Худжанд'), pro('b'), pro('y', 'Бохтар')]));

        const res = await getRecommendedProviders(task);

        expect(ids(res)).toEqual(['a', 'b', 'x', 'y']);
        expect(search).toHaveBeenLastCalledWith({ category: 'Ремонт', limit: 7 });
    });

    it('skips the author and everyone who responded, and asks for enough to cover them', async () => {
        prismaMock.response.findMany.mockResolvedValue([{ userId: 'r1' }, { userId: 'r2' }] as never);
        search
            .mockResolvedValueOnce(page([pro('author'), pro('r1'), pro('a')]))
            .mockResolvedValueOnce(page([pro('r2'), pro('b')]));

        const res = await getRecommendedProviders(task);

        expect(ids(res)).toEqual(['a', 'b']);
        expect(prismaMock.response.findMany).toHaveBeenCalledWith({ where: { taskId: 't1' }, select: { userId: true } });
        expect(search).toHaveBeenCalledWith(expect.objectContaining({ limit: 9 }));
    });

    it('puts BUSINESS first, even from another city, and keeps the rest in directory order', async () => {
        search
            .mockResolvedValueOnce(page([pro('pp', 'Душанбе', 'pro_plus'), pro('free1'), pro('free2')]))
            .mockResolvedValueOnce(page([pro('biz', 'Худжанд', 'business'), pro('pro', 'Бохтар', 'pro')]));

        const res = await getRecommendedProviders(task);

        expect(ids(res)).toEqual(['biz', 'pp', 'free1', 'free2', 'pro']);
    });

    it('searches every city when the task has none', async () => {
        search.mockResolvedValueOnce(page([pro('a')]));

        const res = await getRecommendedProviders({ ...task, city: null }, 3);

        expect(ids(res)).toEqual(['a']);
        expect(search).toHaveBeenCalledTimes(1);
        expect(search).toHaveBeenCalledWith({ category: 'Ремонт', limit: 4 });
    });
});
