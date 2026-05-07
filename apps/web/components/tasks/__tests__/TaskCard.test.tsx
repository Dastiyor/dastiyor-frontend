/* eslint-disable react/display-name */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TaskCard, { Task } from '../TaskCard';

// Mock next/link
jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => {
        return <a href={href}>{children}</a>;
    };
});

// Mock toast
jest.mock('@/components/ui/Toast', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock fetch
global.fetch = jest.fn();

describe('TaskCard', () => {
    const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task Title',
        category: 'Cleaning',
        budget: '500',
        city: 'Dushanbe',
        postedAt: '2024-01-01',
        description: 'Test task description',
        urgency: 'normal',
        responseCount: 5,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockResolvedValue({
            json: jest.fn().mockResolvedValue({ isFavorite: false }),
        });
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    it('should render task information', async () => {
        await act(async () => {
            render(<TaskCard task={mockTask} />);
        });

        await waitFor(() => {
            expect(screen.getByText('Test Task Title')).toBeInTheDocument();
        });
        expect(screen.getByText('Cleaning')).toBeInTheDocument();
        expect(screen.getByText('Dushanbe')).toBeInTheDocument();
        expect(screen.getByText(/500/)).toBeInTheDocument();
    });

    it('should display urgency badge', async () => {
        await act(async () => {
            render(<TaskCard task={mockTask} />);
        });

        await waitFor(() => {
            const urgencyBadge = screen.getByText('Обычная');
            expect(urgencyBadge).toBeInTheDocument();
        });
    });

    it('should display response count', async () => {
        await act(async () => {
            render(<TaskCard task={mockTask} />);
        });

        await waitFor(() => {
            expect(screen.getByText(/5 откликов/)).toBeInTheDocument();
        });
    });

    it('should handle favorite toggle', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                json: jest.fn().mockResolvedValue({ isFavorite: false }),
            })
            .mockResolvedValueOnce({
                json: jest.fn().mockResolvedValue({ isFavorite: true }),
            });

        render(<TaskCard task={mockTask} />);

        const favoriteButton = screen.getByRole('button', { name: /favorite/i });
        fireEvent.click(favoriteButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/tasks/favorite',
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });
    });

    it('should display negotiable budget', async () => {
        const negotiableTask = { ...mockTask, budget: 'Договорная' };
        await act(async () => {
            render(<TaskCard task={negotiableTask} />);
        });

        await waitFor(() => {
            const elements = screen.getAllByText('Договорная');
            expect(elements.length).toBeGreaterThan(0);
        });
    });

    it('should link to task details page', async () => {
        await act(async () => {
            render(<TaskCard task={mockTask} />);
        });

        await waitFor(() => {
            const link = screen.getByRole('link');
            expect(link).toHaveAttribute('href', '/tasks/task-1');
        });
    });

    it('should handle share functionality', async () => {
        const mockShare = jest.fn();
        Object.assign(navigator, {
            share: mockShare,
        });

        await act(async () => {
            render(<TaskCard task={mockTask} />);
        });

        await waitFor(() => {
            const shareButton = screen.getByRole('button', { name: /share/i });
            expect(shareButton).toBeInTheDocument();
        });
    });

    it('should display urgent urgency badge', async () => {
        const urgentTask = { ...mockTask, urgency: 'urgent' };
        await act(async () => {
            render(<TaskCard task={urgentTask} />);
        });
        await waitFor(() => {
            expect(screen.getByText('Срочно')).toBeInTheDocument();
        });
    });

    it('should display View Details link', async () => {
        await act(async () => {
            render(<TaskCard task={mockTask} />);
        });
        await waitFor(() => {
            const link = screen.getByRole('link', { name: /Подробнее/i });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', '/tasks/task-1');
        });
    });
});
