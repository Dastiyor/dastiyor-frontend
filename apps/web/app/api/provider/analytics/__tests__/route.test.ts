/** @jest-environment node */
import { GET } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { requireAuth } from '@/lib/require-auth';
import { getProviderAnalytics } from '@/lib/provider-analytics';

jest.mock('@/lib/require-auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/provider-analytics', () => ({ getProviderAnalytics: jest.fn(async () => ({ plan: 'free', locked: [] })) }));

const req = () => new Request('http://localhost/api/provider/analytics', { headers: { authorization: 'Bearer x' } });
const provider = { id: 'p1', role: 'PROVIDER', categories: ['Ремонт'], subscription: null };
const future = new Date(Date.now() + 86_400_000);

describe('GET /api/provider/analytics', () => {
    beforeEach(() => {
        (requireAuth as jest.Mock).mockResolvedValue({ id: 'p1' });
        prismaMock.user.findUnique.mockResolvedValue(provider as never);
    });

    it('401 without a valid session', async () => {
        (requireAuth as jest.Mock).mockResolvedValue(null);
        const res = await GET(req());
        expect(res.status).toBe(401);
    });

    it('404 for a deleted user', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        expect((await GET(req())).status).toBe(404);
    });

    it('403 for a customer', async () => {
        prismaMock.user.findUnique.mockResolvedValue({ ...provider, role: 'CUSTOMER' } as never);
        const res = await GET(req());
        expect(res.status).toBe(403);
        expect((await res.json()).error).toBe('Аналитика доступна только исполнителям');
    });

    it('passes FREE for a provider without a plan, and does not cache', async () => {
        const res = await GET(req());
        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toBe('private, no-store');
        expect(getProviderAnalytics).toHaveBeenCalledWith(provider, null);
    });

    it('passes the active plan, reading legacy ids, and ignores an expired one', async () => {
        prismaMock.user.findUnique.mockResolvedValue({ ...provider, subscription: { plan: 'premium', isActive: true, startDate: new Date(), endDate: future } } as never);
        await GET(req());
        expect(getProviderAnalytics).toHaveBeenLastCalledWith(expect.anything(), 'business');

        prismaMock.user.findUnique.mockResolvedValue({ ...provider, subscription: { plan: 'business', isActive: true, startDate: new Date(), endDate: new Date(Date.now() - 1000) } } as never);
        await GET(req());
        expect(getProviderAnalytics).toHaveBeenLastCalledWith(expect.anything(), null);
    });

    it('500 on a database error', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        prismaMock.user.findUnique.mockRejectedValue(new Error('db'));
        expect((await GET(req())).status).toBe(500);
    });
});
