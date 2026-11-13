/** @jest-environment node */
import { prismaMock } from '../../../__tests__/mocks/prisma';

jest.mock('@/lib/notifications/email', () => ({
    sendPaymentReceiptEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../smartpay', () => ({ getSmartPayInvoice: jest.fn(async () => null) }));
jest.mock('../alif', () => ({ checkAlifTransaction: jest.fn(async () => null) }));

import { completeSmartPayPayment, reconcileSmartPayPayment, reconcileAlifPayment, reconcilePayment } from '../complete';
import { checkAlifTransaction } from '../alif';
import { getSmartPayInvoice } from '../smartpay';
import { sendPaymentReceiptEmail } from '@/lib/notifications/email';

const payment = {
    id: 'pay-1', userId: 'user-1', plan: 'pro', amount: 49, description: 'Подписка PRO', smartpayOrderId: 'DST-1',
    user: { email: 'u@test.com', fullName: 'U', locale: 'ru' },
};
const details = { transactionId: 'inv-1', paymentMethod: null };

describe('completeSmartPayPayment', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
        prismaMock.subscription.findUnique.mockResolvedValue(null);
        prismaMock.subscription.create.mockResolvedValue({} as any);
        prismaMock.notification.create.mockResolvedValue({} as any);
    });

    it('does nothing when another call already completed the payment', async () => {
        prismaMock.payment.updateMany.mockResolvedValue({ count: 0 });
        expect(await completeSmartPayPayment('pay-1', details)).toBe('already_processed');
        expect(prismaMock.payment.update).not.toHaveBeenCalled();
        expect(prismaMock.subscription.create).not.toHaveBeenCalled();
    });

    it('records the payment but activates nothing for an unknown plan, and skips the email without an address', async () => {
        prismaMock.payment.update.mockResolvedValue({ ...payment, plan: null, smartpayOrderId: null, user: { ...payment.user, email: null } } as any);
        expect(await completeSmartPayPayment('pay-1', details)).toBe('completed');
        expect(prismaMock.subscription.create).not.toHaveBeenCalled();
        expect(prismaMock.notification.create).not.toHaveBeenCalled();
        expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
    });

    it('still completes when the receipt email fails', async () => {
        const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
        prismaMock.payment.update.mockResolvedValue(payment as any);
        (sendPaymentReceiptEmail as jest.Mock).mockRejectedValueOnce(new Error('smtp down'));

        expect(await completeSmartPayPayment('pay-1', details)).toBe('completed');
        await new Promise(r => setImmediate(r));

        expect(prismaMock.subscription.create).toHaveBeenCalled();
        expect(sendPaymentReceiptEmail).toHaveBeenCalledWith('u@test.com', 'U', 49, 'Подписка PRO', 'DST-1', 'inv-1', 'ru');
        expect(logged).toHaveBeenCalledWith('Receipt email error:', expect.any(Error));
    });

    describe('reconcileSmartPayPayment', () => {
        const pending = { id: 'pay-1', amount: 49, smartpayOrderId: 'DST-1', transactionId: null };
        const invoice = (over: object) => (getSmartPayInvoice as jest.Mock).mockResolvedValue({ status: 'Charged', paidAmount: 4900, invoiceUuid: 'inv-1', paymentMethod: 'card', ...over });

        beforeEach(() => {
            prismaMock.payment.update.mockResolvedValue(payment as any);
        });

        it('leaves the payment PENDING while the invoice is open or SmartPay is unreachable', async () => {
            invoice({ status: 'open', paidAmount: 0 });
            expect(await reconcileSmartPayPayment(pending)).toBe('PENDING');
            (getSmartPayInvoice as jest.Mock).mockResolvedValue(null);
            expect(await reconcileSmartPayPayment(pending)).toBe('PENDING');
            expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
        });

        it('fails a voided invoice', async () => {
            invoice({ status: 'void', paidAmount: 0 });
            expect(await reconcileSmartPayPayment(pending)).toBe('FAILED');
            expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({ where: { id: 'pay-1', status: 'PENDING' }, data: { status: 'FAILED' } });
        });

        it('completes a charged invoice for exactly the amount', async () => {
            invoice({});
            expect(await reconcileSmartPayPayment(pending)).toBe('COMPLETED');
            expect(prismaMock.payment.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { transactionId: 'inv-1', paymentMethod: 'card' },
            }));
            expect(prismaMock.subscription.create).toHaveBeenCalled();
        });

        it('keeps a charged invoice for a different amount PENDING', async () => {
            jest.spyOn(console, 'error').mockImplementation(() => {});
            invoice({ paidAmount: 200 });
            expect(await reconcileSmartPayPayment(pending)).toBe('PENDING');
            expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
        });

        it('falls back to the stored transaction id, then the order id, without an invoice uuid', async () => {
            invoice({ invoiceUuid: null, paymentMethod: null });
            await reconcileSmartPayPayment({ ...pending, transactionId: 'stored' });
            expect(prismaMock.payment.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { transactionId: 'stored', paymentMethod: null } }));
            await reconcileSmartPayPayment(pending);
            expect(prismaMock.payment.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { transactionId: 'DST-1', paymentMethod: null } }));
        });
    });

    describe('reconcileAlifPayment', () => {
        const pending = { id: 'pay-1', amount: 2, smartpayOrderId: 'DST-1' };
        const txn = (over: object) => (checkAlifTransaction as jest.Mock).mockResolvedValue({ status: 'ok', transactionId: '789', amount: 200, method: 'korti_milli', ...over });

        beforeEach(() => {
            prismaMock.payment.update.mockResolvedValue(payment as any);
        });

        it('leaves the payment PENDING while Alif says pending or can\'t be checked', async () => {
            txn({ status: 'pending' });
            expect(await reconcileAlifPayment(pending)).toBe('PENDING');
            (checkAlifTransaction as jest.Mock).mockResolvedValue(null);
            expect(await reconcileAlifPayment(pending)).toBe('PENDING');
            expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
        });

        it('fails a failed payment', async () => {
            txn({ status: 'failed' });
            expect(await reconcileAlifPayment(pending)).toBe('FAILED');
            expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({ where: { id: 'pay-1', status: 'PENDING' }, data: { status: 'FAILED' } });
        });

        it('completes an ok payment for exactly the amount, recording Alif\'s transaction and method', async () => {
            txn({});
            expect(await reconcileAlifPayment(pending)).toBe('COMPLETED');
            expect(prismaMock.payment.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { transactionId: 'alif_789', paymentMethod: 'korti_milli' },
            }));
        });

        it('keeps an ok payment for a different amount PENDING', async () => {
            jest.spyOn(console, 'error').mockImplementation(() => {});
            txn({ amount: 4900 });
            expect(await reconcileAlifPayment(pending)).toBe('PENDING');
            expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
        });
    });

    it('reconcilePayment asks the provider that took the payment', async () => {
        (checkAlifTransaction as jest.Mock).mockResolvedValue(null);
        (getSmartPayInvoice as jest.Mock).mockResolvedValue(null);
        const base = { id: 'pay-1', amount: 2, smartpayOrderId: 'DST-1', transactionId: null };
        await reconcilePayment({ ...base, provider: 'alif' });
        expect(checkAlifTransaction).toHaveBeenCalledWith('DST-1');
        expect(getSmartPayInvoice).not.toHaveBeenCalled();
        await reconcilePayment({ ...base, provider: 'smartpay' });
        expect(getSmartPayInvoice).toHaveBeenCalledWith('DST-1');
    });
});
