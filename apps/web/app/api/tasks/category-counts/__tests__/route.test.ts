import { NextRequest } from 'next/server';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { GET } from '../route';

jest.mock('@/lib/rate-limit', () => ({
    getClientIP: () => '1.2.3.4',
    checkRateLimit: jest.fn(async () => ({ allowed: true })),
    rateLimitExceededResponse: () => new Response(null, { status: 429 }),
}));

describe('GET /api/tasks/category-counts', () => {
    it('counts open tasks per category', async () => {
        (prismaMock.task.groupBy as jest.Mock).mockResolvedValue([
            { category: 'Ремонт', _count: 4 },
            { category: 'Уборка', _count: 1 },
        ]);
        const res = await GET(new NextRequest('http://localhost/api/tasks/category-counts'));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ counts: { 'Ремонт': 4, 'Уборка': 1 } });
        expect(prismaMock.task.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'OPEN' } }));
    });

    it('narrows by city like the feed does', async () => {
        (prismaMock.task.groupBy as jest.Mock).mockResolvedValue([]);
        await GET(new NextRequest('http://localhost/api/tasks/category-counts?city=%D0%A5%D1%83%D0%B4%D0%B6%D0%B0%D0%BD%D0%B4'));
        expect(prismaMock.task.groupBy).toHaveBeenCalledWith(expect.objectContaining({
            where: { status: 'OPEN', city: { contains: 'Худжанд', mode: 'insensitive' } },
        }));
    });

    it('answers 500 when the database fails', async () => {
        (prismaMock.task.groupBy as jest.Mock).mockRejectedValue(new Error('down'));
        const res = await GET(new NextRequest('http://localhost/api/tasks/category-counts'));
        expect(res.status).toBe(500);
    });
});
