/* eslint-disable @typescript-eslint/no-require-imports */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewForm from '../ReviewForm';

jest.mock('@/components/ui/Toast', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
    },
}));

global.fetch = jest.fn();

describe('ReviewForm', () => {
    const defaultProps = {
        taskId: 'task-1',
        providerName: 'Test Provider',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render form with provider name', () => {
        render(<ReviewForm {...defaultProps} />);
        expect(screen.getByText(/Оставить отзыв для Test Provider/i)).toBeInTheDocument();
    });

    it('should show warning when submitting without rating', async () => {
        const { toast } = require('@/components/ui/Toast');
        render(<ReviewForm {...defaultProps} />);

        const form = document.querySelector('form');
        expect(form).toBeInTheDocument();
        fireEvent.submit(form!);

        await waitFor(() => {
            expect(toast.warning).toHaveBeenCalledWith('Пожалуйста, выберите оценку');
        });
    });

    it('should call onReviewSubmitted after successful submit', async () => {
        const onReviewSubmitted = jest.fn();
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

        render(<ReviewForm {...defaultProps} onReviewSubmitted={onReviewSubmitted} />);

        const starButtons = screen.getAllByRole('button').filter(b => b.getAttribute('type') === 'button');
        if (starButtons.length >= 1) fireEvent.click(starButtons[0]);

        const submitButton = screen.getByRole('button', { name: /Отправить отзыв/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/reviews',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
            );
            const call = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(call[1].body);
            expect(body.taskId).toBe('task-1');
            expect(body.rating).toBeGreaterThanOrEqual(1);
            expect(body.rating).toBeLessThanOrEqual(5);
        });

        await waitFor(() => {
            expect(onReviewSubmitted).toHaveBeenCalled();
        }, { timeout: 2000 });
    });

    it('should show success state after submission', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

        render(<ReviewForm {...defaultProps} />);

        const starButtons = screen.getAllByRole('button').filter(b => b.getAttribute('type') === 'button');
        if (starButtons.length >= 1) fireEvent.click(starButtons[0]);
        const submitButton = screen.getByRole('button', { name: /Отправить отзыв/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Спасибо за ваш отзыв/i)).toBeInTheDocument();
        }, { timeout: 2000 });
    });

    it('should have comment textarea', () => {
        render(<ReviewForm {...defaultProps} />);
        const textarea = document.querySelector('textarea');
        expect(textarea).toBeInTheDocument();
    });
});
