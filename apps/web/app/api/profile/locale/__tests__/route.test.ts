import { PUT } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

jest.mock('@/lib/auth', () => ({ verifyJWTWithVersion: jest.fn(), getBearerToken: jest.fn(() => null) }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

const req = (body: unknown) =>
    new NextRequest('http://localhost/api/profile/locale', { method: 'PUT', body: JSON.stringify(body) });

describe('PUT /api/profile/locale', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => ({ value: 'token' })) });
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue({ id: 'user-1' });
        prismaMock.user.update.mockResolvedValue({} as never);
    });

    it('stores a supported locale', async () => {
        for (const locale of ['ru', 'tj', 'en']) {
            const res = await PUT(req({ locale }));
            expect(res.status).toBe(200);
            expect(prismaMock.user.update).toHaveBeenLastCalledWith({
                where: { id: 'user-1' }, data: { locale },
            });
        }
    });

    it('coerces anything unsupported to Russian rather than storing junk', async () => {
        // A bad value here would silently blank every notification for that user.
        await PUT(req({ locale: 'klingon' }));
        expect(prismaMock.user.update).toHaveBeenCalledWith({
            where: { id: 'user-1' }, data: { locale: 'ru' },
        });
    });

    it('requires authentication', async () => {
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue(null);
        expect((await PUT(req({ locale: 'en' }))).status).toBe(401);
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
});
