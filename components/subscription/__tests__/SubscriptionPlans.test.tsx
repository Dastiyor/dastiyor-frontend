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
    const defaultProps = {
        currentPlan: null,
        userId: 'user-1',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render all three plans', () => {
        render(<SubscriptionPlans {...defaultProps} />);
        const headings = screen.getAllByRole('heading', { level: 3 });
        const names = headings.map(h => h.textContent);
        expect(names).toContain('Базовый');
        expect(names).toContain('Стандарт');
        expect(names).toContain('Премиум');
    });

    it('should display prices', () => {
        render(<SubscriptionPlans {...defaultProps} />);
        const price99 = screen.getAllByText(/^99$/);
        const price199 = screen.getAllByText(/^199$/);
        const price399 = screen.getAllByText(/^399$/);
        expect(price99.length).toBeGreaterThanOrEqual(1);
        expect(price199.length).toBeGreaterThanOrEqual(1);
        expect(price399.length).toBeGreaterThanOrEqual(1);
    });

    it('should show current plan when provided', () => {
        render(<SubscriptionPlans {...defaultProps} currentPlan="basic" />);
        expect(screen.getByRole('button', { name: /текущий план/i })).toBeInTheDocument();
    });

    it.skip('should call API when subscribing to a plan', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ subscription: {}, message: 'OK' }),
        });

        render(<SubscriptionPlans {...defaultProps} />);

        const subscribeButtons = screen.getAllByRole('button', { name: /подписаться/i });
        expect(subscribeButtons.length).toBeGreaterThanOrEqual(1);
        fireEvent.click(subscribeButtons[0]);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/subscription',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plan: 'basic' }),
                })
            );
        });
    });
});
