import { render, screen } from '@testing-library/react';
import ResponseList from '../ResponseList';

jest.mock('next/link', () => {
    const Link = ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>;
    Link.displayName = 'Link';
    return Link;
});

jest.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));

jest.mock('@/lib/i18n', () => ({
    useTranslation: () => ({ t: (key: string) => key, tr: (v: string) => v, locale: 'ru', setLocale: jest.fn() }),
}));

const baseProps = {
    taskId: 'task-1',
    currentUserId: 'provider-1',
    currentUserRole: 'PROVIDER',
    taskOwnerId: 'owner-1',
    taskStatus: 'OPEN',
};

const myResponse = {
    id: 'r1',
    userId: 'provider-1',
    status: 'PENDING',
    price: '500',
    message: 'I can do it',
    user: { fullName: 'Provider One' },
};

describe('ResponseList response form', () => {
    it('shows the form to a provider who has not responded yet', () => {
        render(<ResponseList {...baseProps} responses={[]} />);
        expect(screen.getByText('tasks.submitOffer')).toBeInTheDocument();
    });

    it('replaces the form with a confirmation once the provider has responded', () => {
        render(<ResponseList {...baseProps} responses={[myResponse]} />);
        expect(screen.queryByText('tasks.submitOffer')).not.toBeInTheDocument();
        expect(screen.getByText('tasks.alreadyResponded')).toBeInTheDocument();
    });
});
