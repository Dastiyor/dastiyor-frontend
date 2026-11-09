import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SubscriptionPlans from '../SubscriptionPlans';

jest.mock('@/components/ui/Toast', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

global.fetch = jest.fn();

describe('SubscriptionPlans', () => {
    const defaultProps = { currentPlan: null };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows FREE, PRO, PRO+ and BUSINESS with their prices', () => {
        render(<SubscriptionPlans {...defaultProps} />);
        const names = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
        expect(names).toEqual(['FREE', 'PRO', 'PRO+', 'BUSINESS']);
        for (const price of ['0', '49', '99', '199']) {
            expect(screen.getAllByText(new RegExp(`^${price}$`)).length).toBeGreaterThanOrEqual(1);
        }
        expect(screen.getByText('5 откликов в месяц')).toBeInTheDocument();
        expect(screen.getByText('Значок: TOP')).toBeInTheDocument();
    });

    it('marks FREE as current when there is no paid plan', () => {
        render(<SubscriptionPlans {...defaultProps} />);
        expect(screen.getByTestId('plan-free')).toHaveTextContent(/текущий план/i);
        expect(screen.getAllByRole('button', { name: /оплатить/i })).toHaveLength(3);
    });

    it('marks the active paid plan as current', () => {
        render(<SubscriptionPlans currentPlan="pro_plus" />);
        expect(screen.getByTestId('plan-pro_plus')).toHaveTextContent(/текущий план/i);
        expect(screen.getByTestId('plan-free')).not.toHaveTextContent(/текущий план/i);
        expect(screen.getAllByRole('button', { name: /оплатить/i })).toHaveLength(2);
    });

    it('asks a signed-out visitor to sign in instead of paying', () => {
        render(<SubscriptionPlans currentPlan={null} signedIn={false} />);
        expect(screen.queryByRole('button', { name: /оплатить/i })).not.toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /войдите/i })[0]).toHaveAttribute('href', '/login?redirect=/subscription');
    });

    it('shows an error and stays put when checkout fails', async () => {
        const { toast } = jest.requireMock('@/components/ui/Toast');
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Неверный тариф' }) });
        render(<SubscriptionPlans {...defaultProps} />);
        fireEvent.click(screen.getAllByRole('button', { name: /оплатить/i })[0]);
        await waitFor(() => expect(toast.error).toHaveBeenCalled());

        (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
        fireEvent.click(screen.getAllByRole('button', { name: /оплатить/i })[0]);
        await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    });

    it('should call subscription API and redirect to paymentUrl', async () => {
        const mockAssign = jest.fn();
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { assign: mockAssign },
        });

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ paymentUrl: 'https://smartpay.tj/checkout/abc', orderId: 'ORDER-001', paymentId: 'pay-1' }),
        });

        render(<SubscriptionPlans {...defaultProps} />);

        const subscribeButtons = screen.getAllByRole('button', { name: /оплатить/i });
        expect(subscribeButtons.length).toBeGreaterThanOrEqual(1);
        fireEvent.click(subscribeButtons[0]);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/subscription',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        });

        await waitFor(() => {
            expect(mockAssign).toHaveBeenCalledWith('https://smartpay.tj/checkout/abc');
        });
    });
});
