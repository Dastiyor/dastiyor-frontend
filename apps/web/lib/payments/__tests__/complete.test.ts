/** @jest-environment node */
import { prismaMock } from '../../../__tests__/mocks/prisma';

jest.mock('@/lib/notifications/email', () => ({
    sendPaymentReceiptEmail: jest.fn().mockResolvedValue(undefined),
}));

import { completeSmartPayPayment } from '../complete';
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
});
