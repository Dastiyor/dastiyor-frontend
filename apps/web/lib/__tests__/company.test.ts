jest.mock('@/lib/prisma', () => ({
    prisma: { systemSetting: { findUnique: jest.fn() } },
}));

import { getCompany } from '@/lib/company';
import { COMPANY_DEFAULTS } from '@/lib/company-defaults';
import { prisma } from '@/lib/prisma';

const findUnique = prisma.systemSetting.findUnique as jest.Mock;

describe('getCompany', () => {
    beforeEach(() => jest.clearAllMocks());

    it('reads the company blob the admin panel writes', async () => {
        findUnique.mockResolvedValue({
            value: JSON.stringify({
                name: 'Dastiyor LLC',
                email: 'info@dastiyor.com',
                phone: '+992 900 00 00 01',
                supportEmail: 'support@dastiyor.com',
                address: 'Душанбе, ул. Рудаки 1',
            }),
        });

        await expect(getCompany()).resolves.toEqual({
            name: 'Dastiyor LLC',
            email: 'info@dastiyor.com',
            phone: '+992 900 00 00 01',
            supportEmail: 'support@dastiyor.com',
            address: 'Душанбе, ул. Рудаки 1',
        });
        expect(findUnique).toHaveBeenCalledWith({ where: { key: 'company' } });
    });

    it('fills gaps with defaults when the admin saved only some fields', async () => {
        findUnique.mockResolvedValue({ value: JSON.stringify({ phone: '+992 111' }) });

        const c = await getCompany();

        expect(c.phone).toBe('+992 111');
        expect(c.supportEmail).toBe(COMPANY_DEFAULTS.supportEmail);
    });

    // The admin panel stores '' for a cleared field. Empty must win over the
    // default, or clearing a value in the panel would silently restore it.
    it('keeps a deliberately cleared field empty', async () => {
        findUnique.mockResolvedValue({ value: JSON.stringify({ address: '' }) });
        await expect(getCompany()).resolves.toMatchObject({ address: '' });
    });

    it('falls back to defaults when the row does not exist', async () => {
        findUnique.mockResolvedValue(null);
        await expect(getCompany()).resolves.toEqual(COMPANY_DEFAULTS);
    });

    it('falls back to defaults when the stored value is not valid JSON', async () => {
        findUnique.mockResolvedValue({ value: '{ broken' });
        await expect(getCompany()).resolves.toEqual(COMPANY_DEFAULTS);
    });

    it('falls back to defaults when the DB is unreachable', async () => {
        findUnique.mockRejectedValue(new Error('connection refused'));
        await expect(getCompany()).resolves.toEqual(COMPANY_DEFAULTS);
    });
});
