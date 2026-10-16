/** @jest-environment node */
import { GET } from '../route';
import { searchProfessionals } from '@/lib/professionals';
import { checkRateLimit } from '@/lib/rate-limit';

jest.mock('@/lib/professionals', () => ({
    ...jest.requireActual('@/lib/professionals'),
    searchProfessionals: jest.fn(),
}));
jest.mock('@/lib/rate-limit', () => ({
    ...jest.requireActual('@/lib/rate-limit'),
    checkRateLimit: jest.fn(),
}));

const search = searchProfessionals as jest.Mock;
const get = (qs = '') => GET(new Request(`http://localhost/api/professionals${qs}`));

describe('GET /api/professionals', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true, remaining: 99, resetIn: 0 });
        search.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    });

    it('returns the search result', async () => {
        search.mockResolvedValue({ items: [{ id: 'u1' }], total: 1, page: 1, limit: 20 });
        const res = await get();
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ items: [{ id: 'u1' }], total: 1, page: 1, limit: 20 });
    });

    it('passes category, city, q, sort and page through', async () => {
        await get('?q=%D1%81%D0%B0%D0%BD&category=%D0%A0%D0%B5%D0%BC%D0%BE%D0%BD%D1%82&city=%D0%A5%D1%83%D0%B4%D0%B6%D0%B0%D0%BD%D0%B4&sort=reviews&page=2');
        expect(search).toHaveBeenCalledWith({ q: 'сан', category: 'Ремонт', city: 'Худжанд', sort: 'reviews', page: 2, limit: 20 });
    });

    it('clamps limit to 50', async () => {
        await get('?limit=1000');
        expect(search).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
    });

    it('defaults a bad sort to rating', async () => {
        await get('?sort=drop');
        expect(search).toHaveBeenCalledWith(expect.objectContaining({ sort: 'rating' }));
    });

    it('returns 429 when rate limited', async () => {
        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: false, remaining: 0, resetIn: 30 });
        const res = await get();
        expect(res.status).toBe(429);
        expect(search).not.toHaveBeenCalled();
    });

    it('returns 500 when the query fails', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        search.mockRejectedValue(new Error('db down'));
        expect((await get()).status).toBe(500);
    });
});
