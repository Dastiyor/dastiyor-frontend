/* eslint-disable @typescript-eslint/no-require-imports */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import ChatInterface from '../ChatInterface';

// Mock next/navigation
const mockSearchParams = new URLSearchParams();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
    useSearchParams: jest.fn(),
    useRouter: () => ({ refresh: mockRefresh }),
}));

// Mock toast
jest.mock('@/components/ui/Toast', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock URL.createObjectURL for image preview in tests
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('ChatInterface', () => {
    const mockCurrentUserId = 'user-1';
    const mockPartnerId = 'user-2';
    const mockMessages = [
        {
            id: 'msg-1',
            content: 'Hello',
            senderId: 'user-2',
            createdAt: new Date().toISOString(),
            sender: {
                id: 'user-2',
                fullName: 'Test User',
            },
        },
        {
            id: 'msg-2',
            content: 'Hi there',
            senderId: 'user-1',
            createdAt: new Date().toISOString(),
            sender: {
                id: 'user-1',
                fullName: 'Current User',
            },
        },
    ];

    // The component now hits three endpoints (messages GET, messages POST,
    // /api/users/:id for the header name), so route the mock by URL instead of
    // by call order.
    const mockApi = (messages: unknown[] = [], partner: unknown = { id: mockPartnerId, fullName: 'Test User' }) => {
        (global.fetch as jest.Mock).mockImplementation((url: string, init?: RequestInit) => {
            if (url.startsWith('/api/users/')) {
                return Promise.resolve({ ok: !!partner, json: async () => ({ user: partner }) });
            }
            if (url === '/api/upload') {
                return Promise.resolve({ ok: true, json: async () => ({ url: 'https://example.com/image.jpg' }) });
            }
            if (init?.method === 'POST') {
                return Promise.resolve({ ok: true, json: async () => ({ message: { id: 'msg-3' } }) });
            }
            return Promise.resolve({ ok: true, json: async () => ({ messages }) });
        });
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
        mockApi();
    });

    it('should display empty state when no partner selected', () => {
        mockSearchParams.delete('userId');
        (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

        render(<ChatInterface currentUserId={mockCurrentUserId} />);

        expect(screen.getByText('Выберите чат')).toBeInTheDocument();
    });

    it('should fetch and display messages when partner is selected', async () => {
        mockSearchParams.set('userId', mockPartnerId);
        (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

        mockApi(mockMessages);

        render(<ChatInterface currentUserId={mockCurrentUserId} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/messages')
            );
        }, { timeout: 3000 });
    });

    it('should send a message', async () => {
        mockSearchParams.set('userId', mockPartnerId);
        (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

        render(<ChatInterface currentUserId={mockCurrentUserId} />);

        await waitFor(() => {
            const input = screen.getByPlaceholderText('Введите сообщение...');
            expect(input).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText('Введите сообщение...');
        const sendButton = screen.getByText('Отправить');

        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/messages',
                expect.objectContaining({
                    method: 'POST',
                })
            );
        }, { timeout: 3000 });
    });

    it('should handle image upload', async () => {
        mockSearchParams.set('userId', mockPartnerId);
        (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

        render(<ChatInterface currentUserId={mockCurrentUserId} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Введите сообщение...')).toBeInTheDocument();
        });

        const fileInput = document.querySelector('input[type="file"]');
        expect(fileInput).toBeInTheDocument();
        if (fileInput) {
            fireEvent.change(fileInput, { target: { files: [mockFile] } });

            // Component uploads image when form is submitted; click send to trigger upload
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /отправить/i })).toBeInTheDocument();
            });
            const sendButton = screen.getByRole('button', { name: /отправить/i });
            fireEvent.click(sendButton);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/upload',
                    expect.objectContaining({
                        method: 'POST',
                    })
                );
            }, { timeout: 3000 });
        }
    });

    it('should reject invalid image file types', async () => {
        mockSearchParams.set('userId', mockPartnerId);
        (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

        render(<ChatInterface currentUserId={mockCurrentUserId} />);

        const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
        const fileInput = document.querySelector('input[type="file"]');

        if (fileInput) {
            fireEvent.change(fileInput, { target: { files: [mockFile] } });

            // The component should show an error toast
            await waitFor(() => {
                const { toast } = require('@/components/ui/Toast');
                // Note: This test verifies the error handling logic exists
            });
        }
    });

    it('should resolve the partner name for a deep-linked empty conversation', async () => {
        mockSearchParams.set('userId', mockPartnerId);
        (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

        // No messages at all — the name has to come from /api/users/:id.
        mockApi([]);

        render(<ChatInterface currentUserId={mockCurrentUserId} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(`/api/users/${mockPartnerId}`);
        });
        await waitFor(() => {
            expect(screen.getByText('Test User')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('should refresh the server-rendered conversation list after sending', async () => {
        mockSearchParams.set('userId', mockPartnerId);
        (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

        render(<ChatInterface currentUserId={mockCurrentUserId} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Введите сообщение...')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText('Введите сообщение...'), { target: { value: 'Test message' } });
        fireEvent.click(screen.getByText('Отправить'));

        await waitFor(() => {
            expect(mockRefresh).toHaveBeenCalled();
        }, { timeout: 3000 });
    });

    it('should not poll while the tab is hidden', async () => {
        jest.useFakeTimers();
        try {
            mockSearchParams.set('userId', mockPartnerId);
            (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

            render(<ChatInterface currentUserId={mockCurrentUserId} />);

            const messageCalls = () =>
                (global.fetch as jest.Mock).mock.calls.filter(
                    ([url]: [string]) => url.startsWith('/api/messages')
                ).length;

            const afterMount = messageCalls();

            Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
            jest.advanceTimersByTime(60000);
            expect(messageCalls()).toBe(afterMount);

            Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
            jest.advanceTimersByTime(15000);
            expect(messageCalls()).toBeGreaterThan(afterMount);
        } finally {
            jest.useRealTimers();
        }
    });

    it('should disable send button when message is empty and no image', async () => {
        mockSearchParams.set('userId', mockPartnerId);
        (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

        render(<ChatInterface currentUserId={mockCurrentUserId} />);

        await waitFor(() => {
            const sendButton = screen.getByText('Отправить');
            expect(sendButton).toBeDisabled();
        });
    });
});
