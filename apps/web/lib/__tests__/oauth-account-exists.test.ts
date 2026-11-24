import { prismaMock } from '../../__tests__/mocks/prisma';
import { oauthAccountExists } from '../oauth';

jest.mock('@/lib/notifications/email', () => ({ sendWelcomeEmail: jest.fn() }));
jest.mock('@/lib/audit', () => ({ logAction: jest.fn() }));

describe('oauthAccountExists', () => {
    it('is true when the provider id is already linked', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'u1' } as never);

        await expect(oauthAccountExists({ provider: 'google', providerId: 'g-1', email: 'a@b.c' })).resolves.toBe(true);
        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { googleId: 'g-1' }, select: { id: true } });
        expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('is true when the email belongs to an account (sign-in would link it)', async () => {
        prismaMock.user.findUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 'u2' } as never);

        await expect(oauthAccountExists({ provider: 'apple', providerId: 'a-1', email: 'a@b.c' })).resolves.toBe(true);
        expect(prismaMock.user.findUnique).toHaveBeenNthCalledWith(1, { where: { appleId: 'a-1' }, select: { id: true } });
        expect(prismaMock.user.findUnique).toHaveBeenNthCalledWith(2, { where: { email: 'a@b.c' }, select: { id: true } });
    });

    it('is false for a brand-new person', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        await expect(oauthAccountExists({ provider: 'google', providerId: 'g-2', email: 'new@b.c' })).resolves.toBe(false);
    });
});
