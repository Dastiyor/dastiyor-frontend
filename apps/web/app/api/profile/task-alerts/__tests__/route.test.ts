import { GET, PUT } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

jest.mock('@/lib/auth', () => ({ verifyJWTWithVersion: jest.fn(), getBearerToken: jest.fn(() => null) }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

const URL_ = 'http://localhost/api/profile/task-alerts';
const put = (body: string) => new NextRequest(URL_, { method: 'PUT', body });
const get = () => new NextRequest(URL_);

const FUTURE = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

describe('/api/profile/task-alerts', () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => ({ value: 'token' })) });
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue({ id: 'user-1' });
    });

    afterAll(() => err.mockRestore());

    describe('GET', () => {
        it('returns the switch and the plan the alerts follow', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                taskAlertsEnabled: true,
                subscription: { plan: 'standard', isActive: true, endDate: FUTURE },
            } as never);
            const res = await GET(get());
            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({ enabled: true, plan: 'pro_plus' });
        });

        it('reports FREE without a live subscription', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ taskAlertsEnabled: false, subscription: null } as never);
            expect(await (await GET(get())).json()).toEqual({ enabled: false, plan: 'free' });
        });

        it('requires authentication', async () => {
            (verifyJWTWithVersion as jest.Mock).mockResolvedValue(null);
            expect((await GET(get())).status).toBe(401);
        });

        it('404s for a deleted user', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);
            expect((await GET(get())).status).toBe(404);
        });

        it('500s on a database error', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('db'));
            expect((await GET(get())).status).toBe(500);
        });
    });

    describe('PUT', () => {
        it('stores the switch', async () => {
            prismaMock.user.update.mockResolvedValue({
                taskAlertsEnabled: false,
                subscription: { plan: 'pro', isActive: true, endDate: FUTURE },
            } as never);
            const res = await PUT(put(JSON.stringify({ enabled: false })));
            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({ enabled: false, plan: 'pro' });
            expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'user-1' }, data: { taskAlertsEnabled: false },
            }));
        });

        it('rejects anything but a boolean', async () => {
            for (const body of [JSON.stringify({ enabled: 'yes' }), JSON.stringify({}), 'not json']) {
                const res = await PUT(put(body));
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('Некорректное значение настройки');
            }
            expect(prismaMock.user.update).not.toHaveBeenCalled();
        });

        it('requires authentication', async () => {
            (verifyJWTWithVersion as jest.Mock).mockResolvedValue(null);
            expect((await PUT(put(JSON.stringify({ enabled: true })))).status).toBe(401);
        });

        it('500s on a database error', async () => {
            prismaMock.user.update.mockRejectedValue(new Error('db'));
            expect((await PUT(put(JSON.stringify({ enabled: true })))).status).toBe(500);
        });
    });
});
