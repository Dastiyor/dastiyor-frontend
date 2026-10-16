import { GET, POST, PATCH } from '../route';
import { PUT, DELETE } from '../[id]/route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { cookies } from 'next/headers';

jest.mock('@/lib/auth', () => ({
    verifyJWTWithVersion: jest.fn(),
    getBearerToken: jest.fn(() => null),
}));

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

const BLOB = 'https://abc.public.blob.vercel-storage.com/uploads/p1.jpg';
const project = { id: 'proj-1', title: 'Kitchen', description: null, images: [BLOB], order: 0, userId: 'user-1', createdAt: new Date() };

const req = (method: string, body?: object) =>
    new Request('http://localhost/api/profile/portfolio', { method, body: body ? JSON.stringify(body) : undefined });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe('/api/profile/portfolio', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => ({ value: 'valid-token' })) });
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue({ id: 'user-1' });
        prismaMock.user.findUnique.mockResolvedValue({ role: 'PROVIDER' } as any);
    });

    it('returns 401 without a session', async () => {
        (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });
        expect((await GET(req('GET'))).status).toBe(401);
        expect((await POST(req('POST', { title: 'x' }))).status).toBe(401);
        expect((await PATCH(req('PATCH', { order: [] }))).status).toBe(401);
        expect((await PUT(req('PUT', { title: 'x' }), params('proj-1'))).status).toBe(401);
        expect((await DELETE(req('DELETE'), params('proj-1'))).status).toBe(401);
    });

    it('lists own projects by order', async () => {
        prismaMock.portfolioProject.findMany.mockResolvedValue([project] as any);

        const res = await GET(req('GET'));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.projects).toHaveLength(1);
        expect(prismaMock.portfolioProject.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: 'user-1' },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        }));
    });

    describe('POST', () => {
        beforeEach(() => {
            prismaMock.portfolioProject.count.mockResolvedValue(0);
            prismaMock.portfolioProject.create.mockResolvedValue(project as any);
        });

        it('creates a project for a provider at the end of the list', async () => {
            prismaMock.portfolioProject.count.mockResolvedValue(3);

            const res = await POST(req('POST', { title: '  Kitchen  ', description: 'Tiles', images: [BLOB] }));

            expect(res.status).toBe(201);
            expect(prismaMock.portfolioProject.create).toHaveBeenCalledWith(expect.objectContaining({
                data: { userId: 'user-1', title: 'Kitchen', description: 'Tiles', images: [BLOB], order: 3 },
            }));
        });

        it('returns 403 for a customer', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ role: 'CUSTOMER' } as any);

            const res = await POST(req('POST', { title: 'Kitchen' }));

            expect(res.status).toBe(403);
            expect((await res.json()).error).toBe('Портфолио доступно только исполнителям');
        });

        it('rejects an empty title', async () => {
            const res = await POST(req('POST', { title: '   ' }));
            expect(res.status).toBe(400);
            expect((await res.json()).error).toBe('Название проекта: от 1 до 100 символов');
        });

        it('rejects a description over 1000 characters', async () => {
            const res = await POST(req('POST', { title: 'Kitchen', description: 'x'.repeat(1001) }));
            expect(res.status).toBe(400);
            expect((await res.json()).error).toBe('Описание проекта не должно превышать 1000 символов');
        });

        it('rejects 9 images', async () => {
            const res = await POST(req('POST', { title: 'Kitchen', images: Array(9).fill(BLOB) }));
            expect(res.status).toBe(400);
            expect((await res.json()).error).toBe('Не больше 8 фотографий в проекте');
        });

        it.each(['javascript:alert(1)', 'https://evil.example.com/a.jpg', 42])('rejects image %p', async (img) => {
            const res = await POST(req('POST', { title: 'Kitchen', images: [img] }));
            expect(res.status).toBe(400);
            expect((await res.json()).error).toBe('Некорректная ссылка на фото');
        });

        it('rejects the 21st project', async () => {
            prismaMock.portfolioProject.count.mockResolvedValue(20);

            const res = await POST(req('POST', { title: 'Kitchen' }));

            expect(res.status).toBe(400);
            expect((await res.json()).error).toBe('Не больше 20 проектов в портфолио');
            expect(prismaMock.portfolioProject.create).not.toHaveBeenCalled();
        });
    });

    describe('PUT /[id]', () => {
        it('updates an own project', async () => {
            prismaMock.portfolioProject.findFirst.mockResolvedValue(project as any);
            prismaMock.portfolioProject.update.mockResolvedValue({ ...project, title: 'Bath' } as any);

            const res = await PUT(req('PUT', { title: 'Bath', images: [] }), params('proj-1'));

            expect(res.status).toBe(200);
            expect((await res.json()).project.title).toBe('Bath');
            expect(prismaMock.portfolioProject.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'proj-1' },
                data: { title: 'Bath', description: null, images: [] },
            }));
        });

        it("is 404 for another user's project", async () => {
            prismaMock.portfolioProject.findFirst.mockResolvedValue(null);

            const res = await PUT(req('PUT', { title: 'Bath' }), params('proj-9'));

            expect(res.status).toBe(404);
            expect((await res.json()).error).toBe('Проект не найден');
            expect(prismaMock.portfolioProject.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'proj-9', userId: 'user-1' },
            }));
        });

        it('validates like POST', async () => {
            const res = await PUT(req('PUT', { title: '' }), params('proj-1'));
            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /[id]', () => {
        it('deletes an own project', async () => {
            prismaMock.portfolioProject.deleteMany.mockResolvedValue({ count: 1 });

            const res = await DELETE(req('DELETE'), params('proj-1'));

            expect(res.status).toBe(200);
            expect(prismaMock.portfolioProject.deleteMany).toHaveBeenCalledWith({ where: { id: 'proj-1', userId: 'user-1' } });
        });

        it("is 404 for another user's project", async () => {
            prismaMock.portfolioProject.deleteMany.mockResolvedValue({ count: 0 });

            const res = await DELETE(req('DELETE'), params('proj-9'));

            expect(res.status).toBe(404);
        });
    });

    describe('PATCH reorder', () => {
        it('sets order by position for owned ids only', async () => {
            prismaMock.portfolioProject.findMany.mockResolvedValue([{ id: 'a' }, { id: 'c' }] as any);
            prismaMock.portfolioProject.update.mockResolvedValue(project as any);
            prismaMock.$transaction.mockResolvedValue([] as any);

            const res = await PATCH(req('PATCH', { order: ['c', 'stranger', 'a'] }));

            expect(res.status).toBe(200);
            const updates = prismaMock.portfolioProject.update.mock.calls.map(c => c[0]);
            expect(updates).toEqual([
                { where: { id: 'c' }, data: { order: 0 } },
                { where: { id: 'a' }, data: { order: 1 } },
            ]);
        });

        it('rejects a non-array order', async () => {
            const res = await PATCH(req('PATCH', { order: 'a,b' }));
            expect(res.status).toBe(400);
        });
    });

    describe('database errors', () => {
        beforeEach(() => {
            jest.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.user.findUnique.mockRejectedValue(new Error('db down'));
        });

        it.each([
            ['GET', () => GET(req('GET'))],
            ['POST', () => POST(req('POST', { title: 'x' }))],
            ['PATCH', () => PATCH(req('PATCH', { order: [] }))],
            ['PUT', () => PUT(req('PUT', { title: 'x' }), params('proj-1'))],
            ['DELETE', () => DELETE(req('DELETE'), params('proj-1'))],
        ])('%s returns 500', async (_name, call) => {
            expect((await call()).status).toBe(500);
        });
    });
});
