import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '@/components/Header';

// Mock the child components that might use client-side features
jest.mock('@/components/UserMenu', () => function MockUserMenu({ user }: { user: any }) {
    return <div data-testid="user-menu">{user.fullName}</div>;
});

jest.mock('@/components/LanguageSwitcher', () => function MockLanguageSwitcher() {
    return <div data-testid="lang-switcher">Lang</div>;
});

// Since Header is an async Server Component, we need to test its rendered output
// testing-library currently renders async components if we await them or wrap them properly.
// Alternatively, we mock the dependencies like `cookies` and `@/lib/auth`.

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
    verifyJWT: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        }
    }
}));

import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

describe('Header Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders login button for unauthenticated users', async () => {
        // Mock cookies to return nothing
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn().mockReturnValue(undefined)
        });

        // Resolve the async component
        const HeaderComponent = await Header();
        render(HeaderComponent);

        expect(screen.getByText(/Войти/i)).toBeInTheDocument();
        expect(screen.getByText(/Как это работает/i)).toBeInTheDocument();
        expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
    });

    it('renders user menu for authenticated CUSTOMER users', async () => {
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn().mockReturnValue({ value: 'mock-token' })
        });

        (verifyJWT as jest.Mock).mockResolvedValue({ id: 'user-id' });

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-id',
            fullName: 'Ali T',
            role: 'CUSTOMER'
        });

        const HeaderComponent = await Header();
        render(HeaderComponent);

        expect(screen.getByTestId('user-menu')).toHaveTextContent('Ali T');
        expect(screen.getByText('Шаблоны')).toBeInTheDocument();
        expect(screen.queryByText(/Войти/i)).not.toBeInTheDocument();
    });
});
