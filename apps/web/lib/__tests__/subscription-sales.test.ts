import { prismaMock } from '../../__tests__/mocks/prisma';
import { isSubscriptionSalesEnabled } from '@/lib/subscription-sales';

const stored = (value: string | null) =>
    (prismaMock.systemSetting.findUnique as jest.Mock).mockResolvedValue(value === null ? null : { key: 'subscriptions', value });

describe('isSubscriptionSalesEnabled', () => {
    beforeEach(() => jest.clearAllMocks());

    it('is on when the admin has never touched the switch', async () => {
        stored(null);
        await expect(isSubscriptionSalesEnabled()).resolves.toBe(true);
        expect(prismaMock.systemSetting.findUnique).toHaveBeenCalledWith({ where: { key: 'subscriptions' } });
    });

    it('is off only for an explicit false', async () => {
        stored('{"salesEnabled":false}');
        await expect(isSubscriptionSalesEnabled()).resolves.toBe(false);
    });

    it.each(['{"salesEnabled":true}', '{}', 'null', '{"salesEnabled":"false"}', '', 'not json'])(
        'stays on for %j', async (value) => {
            jest.spyOn(console, 'error').mockImplementation(() => {});
            stored(value);
            await expect(isSubscriptionSalesEnabled()).resolves.toBe(true);
        });

    it('stays on when the lookup fails', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        (prismaMock.systemSetting.findUnique as jest.Mock).mockRejectedValue(new Error('down'));
        await expect(isSubscriptionSalesEnabled()).resolves.toBe(true);
    });
});
