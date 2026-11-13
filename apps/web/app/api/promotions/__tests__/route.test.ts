/** @jest-environment node */
import { GET, POST } from '../route';
import { prismaMock } from '../../../../__tests__/mocks/prisma';
import { requireAuth } from '@/lib/require-auth';
import { getPromotionStatus, startPromotion, PROMOTION_ERRORS } from '@/lib/promotions';
import { checkRateLimit } from '@/lib/rate-limit';

jest.mock('@/lib/require-auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/categories', () => ({ getCategories: jest.fn(async () => ['Ремонт', 'Уборка']) }));
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: jest.fn(async () => ({ allowed: true, remaining: 9, resetIn: 0 })),
    rateLimitExceededResponse: jest.fn(() => new Response('{}', { status: 429 })),
}));
jest.mock('@/lib/promotions', () => ({
    ...jest.requireActual('@/lib/promotions'),
    getPromotionStatus: jest.fn(),
    startPromotion: jest.fn(),
}));

const auth = requireAuth as jest.Mock;
const status = { plan: 'business', limit: 5, used: 1, remaining: 4 };
const req = (body?: unknown) => new Request('http://localhost/api/promotions', {
    method: body === undefined ? 'GET' : 'POST',
    ...(body !== undefined && { body: typeof body === 'string' ? body : JSON.stringify(body) }),
});

describe('/api/promotions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        auth.mockResolvedValue({ id: 'u1' });
        prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', role: 'PROVIDER', categories: ['Ремонт', 'Удалённая'] } as never);
        (getPromotionStatus as jest.Mock).mockResolvedValue(status);
    });

    it('401 without a session or for a deleted user', async () => {
        auth.mockResolvedValueOnce(null);
        expect((await GET(req())).status).toBe(401);
        prismaMock.user.findUnique.mockResolvedValueOnce(null);
        expect((await POST(req({}))).status).toBe(401);
    });

    it('403 for customers', async () => {
        prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CUSTOMER', categories: [] } as never);
        const res = await GET(req());
        expect(res.status).toBe(403);
        expect((await res.json()).error).toBe(PROMOTION_ERRORS.providerOnly);
    });

    it('GET returns the status, with only categories that still exist', async () => {
        const res = await GET(req());
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(status);
        expect(getPromotionStatus).toHaveBeenCalledWith('u1', { categories: ['Ремонт'] });
    });

    it('POST starts a promotion and returns it with the new status', async () => {
        (startPromotion as jest.Mock).mockResolvedValue({ ok: true, promotion: { id: 'p1', category: null } });
        const res = await POST(req('not json'));
        expect(res.status).toBe(201);
        expect(await res.json()).toEqual({ promotion: { id: 'p1', category: null }, status });
        expect(startPromotion).toHaveBeenCalledWith('u1', null);
        expect(checkRateLimit).toHaveBeenCalledWith('promotion:u1', 'responses');
    });

    it('POST with a category pins there', async () => {
        (startPromotion as jest.Mock).mockResolvedValue({ ok: true, promotion: { id: 'p1', category: 'Ремонт' } });
        expect((await POST(req({ category: ' Ремонт ' }))).status).toBe(201);
        expect(startPromotion).toHaveBeenCalledWith('u1', 'Ремонт');
    });

    it('POST rejects an unknown category or one outside the profile', async () => {
        let res = await POST(req({ category: 'Нет такой' }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe(PROMOTION_ERRORS.unknownCategory);

        res = await POST(req({ category: 'Уборка' }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe(PROMOTION_ERRORS.categoryNotInProfile);
        expect(startPromotion).not.toHaveBeenCalled();
    });

    it('POST passes refusals through with their code and next free slot', async () => {
        (startPromotion as jest.Mock).mockResolvedValue({
            ok: false, status: 409, error: PROMOTION_ERRORS.slotsFull, code: 'PIN_SLOTS_FULL', nextFreeAt: '2026-11-20T18:00:00.000Z',
        });
        const res = await POST(req({ category: 'Ремонт' }));
        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({ error: PROMOTION_ERRORS.slotsFull, code: 'PIN_SLOTS_FULL', nextFreeAt: '2026-11-20T18:00:00.000Z' });

        (startPromotion as jest.Mock).mockResolvedValue({ ok: false, status: 409, error: PROMOTION_ERRORS.noCredits, code: 'PROMOTION_CREDITS_EXHAUSTED' });
        expect(await (await POST(req({}))).json()).toEqual({ error: PROMOTION_ERRORS.noCredits, code: 'PROMOTION_CREDITS_EXHAUSTED' });
    });

    it('POST is rate limited', async () => {
        (checkRateLimit as jest.Mock).mockResolvedValueOnce({ allowed: false, remaining: 0, resetIn: 30 });
        expect((await POST(req({}))).status).toBe(429);
        expect(startPromotion).not.toHaveBeenCalled();
    });

    it('500 on unexpected errors', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        (getPromotionStatus as jest.Mock).mockRejectedValueOnce(new Error('db'));
        expect((await GET(req())).status).toBe(500);
        (startPromotion as jest.Mock).mockRejectedValueOnce(new Error('db'));
        expect((await POST(req({}))).status).toBe(500);
    });
});
