/** @jest-environment node */
import { GET } from '../route';
import { prismaMock } from '../../../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getRecommendedProviders } from '@/lib/recommended-providers';
import { checkRateLimit } from '@/lib/rate-limit';

jest.mock('@/lib/auth', () => ({
    verifyJWTWithVersion: jest.fn(),
    getBearerToken: jest.fn(() => null),
}));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/lib/recommended-providers', () => ({ getRecommendedProviders: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({
    ...jest.requireActual('@/lib/rate-limit'),
    checkRateLimit: jest.fn(),
}));

const call = (id = 'task-1') =>
    GET(new Request(`http://localhost/api/tasks/${id}/recommended-providers`), { params: Promise.resolve({ id }) });
const task = { id: 'task-1', userId: 'customer-1', category: 'Ремонт', city: 'Душанбе', status: 'OPEN' };
const card = {
    id: 'p1', fullName: 'Ali', avatar: null, city: 'Душанбе', categories: ['Ремонт'], experienceYears: null,
    isVerified: false, avgRating: 4.8, reviewCount: 3, completedCount: 2, tier: 'business',
};

describe('GET /api/tasks/[id]/recommended-providers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => ({ value: 'token' })) });
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue({ id: 'customer-1' });
        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true, remaining: 99, resetIn: 0 });
        (getRecommendedProviders as jest.Mock).mockResolvedValue([card]);
    });

    it('401 without a valid session', async () => {
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue(null);
        const res = await call();
        expect(res.status).toBe(401);
        expect((await res.json()).error).toBe('Unauthorized');
    });

    it('429 when rate limited', async () => {
        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: false, remaining: 0, resetIn: 30 });
        expect((await call()).status).toBe(429);
    });

    it('404 for an unknown task', async () => {
        prismaMock.task.findUnique.mockResolvedValue(null);
        const res = await call('nope');
        expect(res.status).toBe(404);
        expect((await res.json()).error).toBe('Задание не найдено');
    });

    it("403 for someone else's task", async () => {
        prismaMock.task.findUnique.mockResolvedValue({ ...task, userId: 'other' } as never);
        const res = await call();
        expect(res.status).toBe(403);
        expect((await res.json()).error).toBe('Доступ запрещён: это не ваше задание');
        expect(getRecommendedProviders).not.toHaveBeenCalled();
    });

    it('returns the providers for an open task', async () => {
        prismaMock.task.findUnique.mockResolvedValue(task as never);
        const res = await call();
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ providers: [card] });
        expect(getRecommendedProviders).toHaveBeenCalledWith(task);
    });

    it('returns an empty list once the task is no longer open', async () => {
        prismaMock.task.findUnique.mockResolvedValue({ ...task, status: 'IN_PROGRESS' } as never);
        expect(await (await call()).json()).toEqual({ providers: [] });
        expect(getRecommendedProviders).not.toHaveBeenCalled();
    });

    it('500 when the lookup fails', async () => {
        prismaMock.task.findUnique.mockRejectedValue(new Error('db down'));
        jest.spyOn(console, 'error').mockImplementation(() => {});
        expect((await call()).status).toBe(500);
    });
});
