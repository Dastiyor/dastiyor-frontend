import { prismaMock } from '../../../__tests__/mocks/prisma';
import { completePayment, failPayment } from '../complete';

jest.mock('@/lib/notifications/email', () => ({
    sendPaymentReceiptEmail: jest.fn().mockResolvedValue(undefined),
}));
import { sendPaymentReceiptEmail } from '@/lib/notifications/email';

const DAY = 864e5;
const paid = (over: object = {}) => ({
    id: 'pay-1', userId: 'user-1', orderId: 'DST-1', plan: 'pro_plus', amount: 99,
    description: 'Подписка PRO+', status: 'COMPLETED',
    user: { email: 'p@example.com', fullName: 'Алишер', locale: 'ru' }, ...over,
});

describe('completePayment', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
        prismaMock.payment.update.mockResolvedValue(paid() as any);
        prismaMock.subscription.findUnique.mockResolvedValue(null);
    });

    it('claims the payment only while PENDING', async () => {
        prismaMock.payment.updateMany.mockResolvedValue({ count: 0 });

        expect(await completePayment('pay-1', { transactionId: '26136' })).toBe(false);
        expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({ where: { id: 'pay-1', status: 'PENDING' }, data: { status: 'COMPLETED' } });
        expect(prismaMock.subscription.create).not.toHaveBeenCalled();
        expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
    });

    it('records the transaction, starts a 30-day plan, notifies and emails a receipt', async () => {
        const before = Date.now();

        expect(await completePayment('pay-1', { transactionId: '26136', paymentMethod: 'korti_milli' })).toBe(true);

        expect(prismaMock.payment.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'pay-1' }, data: { transactionId: '26136', paymentMethod: 'korti_milli' },
        }));
        const data = prismaMock.subscription.create.mock.calls[0][0].data as any;
        expect(data).toMatchObject({ userId: 'user-1', plan: 'pro_plus', isActive: true, source: 'web' });
        expect(data.endDate.getTime() - before).toBeGreaterThanOrEqual(30 * DAY - 1000);
        expect(data.endDate.getTime() - before).toBeLessThan(30 * DAY + 2 * 3600e3);
        expect(prismaMock.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'user-1', title: 'Подписка активирована' }) });
        expect(sendPaymentReceiptEmail).toHaveBeenCalledWith('p@example.com', 'Алишер', 99, 'Подписка PRO+', 'DST-1', '26136', 'ru');
    });

    it('adds 30 days to an active plan that has not ended', async () => {
        const end = new Date(Date.now() + 10 * DAY);
        const start = new Date(Date.now() - 20 * DAY);
        prismaMock.subscription.findUnique.mockResolvedValue({ userId: 'user-1', isActive: true, endDate: end, startDate: start } as any);

        await completePayment('pay-1', { transactionId: '26136' });

        const data = prismaMock.subscription.update.mock.calls[0][0].data as any;
        expect(data.startDate).toBe(start);
        expect(data.endDate.getTime() - end.getTime()).toBeGreaterThanOrEqual(30 * DAY - 2 * 3600e3);
        expect(data.endDate.getTime() - end.getTime()).toBeLessThanOrEqual(30 * DAY + 2 * 3600e3);
    });

    it('restarts a plan that has ended', async () => {
        prismaMock.subscription.findUnique.mockResolvedValue({ userId: 'user-1', isActive: false, endDate: new Date(Date.now() - DAY), startDate: new Date(0) } as any);
        const before = Date.now();

        await completePayment('pay-1', { transactionId: '26136' });

        const data = prismaMock.subscription.update.mock.calls[0][0].data as any;
        expect(data.startDate.getTime()).toBeGreaterThanOrEqual(before);
        expect(data.endDate.getTime() - before).toBeGreaterThanOrEqual(30 * DAY - 1000);
    });

    it('activates the replacement of a legacy plan id', async () => {
        prismaMock.payment.update.mockResolvedValue(paid({ plan: 'premium' }) as any);
        await completePayment('pay-1', { transactionId: '26136' });
        expect((prismaMock.subscription.create.mock.calls[0][0].data as any).plan).toBe('business');
    });

    it('activates nothing for a payment without a plan, and sends no email without an address', async () => {
        prismaMock.payment.update.mockResolvedValue(paid({ plan: null, orderId: null, user: { email: null, fullName: 'X', locale: 'ru' } }) as any);

        expect(await completePayment('pay-1', { transactionId: '26136' })).toBe(true);
        expect(prismaMock.subscription.create).not.toHaveBeenCalled();
        expect(prismaMock.notification.create).not.toHaveBeenCalled();
        expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
    });

    it('does not fail when the receipt email fails', async () => {
        (sendPaymentReceiptEmail as jest.Mock).mockRejectedValueOnce(new Error('brevo down'));
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(completePayment('pay-1', { transactionId: '26136' })).resolves.toBe(true);
        await new Promise(r => setTimeout(r, 0));
        expect(spy).toHaveBeenCalledWith('Receipt email error:', expect.any(Error));
        spy.mockRestore();
    });
});

describe('failPayment', () => {
    it('fails only a PENDING payment', async () => {
        prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
        await failPayment('pay-1');
        expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({ where: { id: 'pay-1', status: 'PENDING' }, data: { status: 'FAILED' } });
    });
});
