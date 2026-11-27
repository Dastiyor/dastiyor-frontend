import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '../page';

let query = '';
jest.mock('next/navigation', () => ({
    useRouter: () => ({ replace: jest.fn() }),
    useSearchParams: () => new URLSearchParams(query),
}));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
jest.mock('@/lib/i18n', () => {
    const i18n = { t: (k: string) => k, tr: (v: string) => v, tError: (m: string) => m, locale: 'ru' };
    return { useTranslation: () => i18n };
});
jest.mock('@/lib/useHydrated', () => ({ useHydrated: () => true, useAdoptTypedValue: () => {} }));
jest.mock('@/components/LanguageSwitcher', () => ({ __esModule: true, default: () => null }));

let registerReply: { status: number; body: unknown };
let posted: [string, Record<string, unknown>][] = [];
beforeEach(() => {
    query = '';
    posted = [];
    registerReply = { status: 400, body: { error: 'Пользователь с таким email уже существует' } };
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/auth/me') return { ok: false, status: 401, json: async () => ({}) };
        posted.push([url, JSON.parse(String(init?.body))]);
        const res = url === '/api/auth/register' ? registerReply
            : { status: 200, body: url === '/api/auth/verify-check' ? { ticket: 'tkt' } : {} };
        return { ok: res.status < 400, status: res.status, json: async () => res.body };
    }) as unknown as typeof fetch;
});

function submitForm() {
    const name = screen.getByLabelText('auth.fullName');
    fireEvent.change(name, { target: { value: 'Али' } });
    fireEvent.change(screen.getByLabelText('auth.phone'), { target: { value: '901234567' } });
    fireEvent.submit(name.closest('form')!);
}

async function enterCode() {
    const code = await screen.findByLabelText('auth.verifyPhoneCodeLabel');
    fireEvent.change(code, { target: { value: '123456' } });
    fireEvent.submit(code.closest('form')!);
}

describe('/register', () => {
    it('asks the role last, and sends it with the ticket', async () => {
        render(<RegisterPage />);
        expect(screen.queryByText('auth.iWantToFind')).toBeNull();
        submitForm();
        await enterCode();
        fireEvent.click(await screen.findByRole('button', { name: /auth.iWantToWork/ }));

        await waitFor(() => expect(posted.map(([url]) => url)).toEqual([
            '/api/auth/verify-send', '/api/auth/verify-check', '/api/auth/register',
        ]));
        expect(posted[2][1]).toMatchObject({ role: 'provider', ticket: 'tkt', phone: '+992901234567' });
        expect(posted[2][1]).not.toHaveProperty('password');
    });

    it('returns to the form when it is turned down, without a second SMS', async () => {
        render(<RegisterPage />);
        submitForm();
        await enterCode();
        fireEvent.click(await screen.findByRole('button', { name: /auth.iWantToFind/ }));
        expect(await screen.findByText('Пользователь с таким email уже существует')).toBeInTheDocument();

        submitForm();
        expect(await screen.findByText(/auth.phoneConfirmedLastStep/)).toBeInTheDocument();
        expect(posted.filter(([url]) => url === '/api/auth/verify-send')).toHaveLength(1);
    });

    it('does not ask a role that came with the link', async () => {
        query = 'type=provider';
        render(<RegisterPage />);
        submitForm();
        await enterCode();

        await waitFor(() => expect(posted).toHaveLength(2));
        expect(posted[1]).toEqual(['/api/auth/register', expect.objectContaining({ role: 'provider', code: '123456' })]);
    });

    it('never sends Google off without a role', () => {
        render(<RegisterPage />);
        expect(screen.getByText('auth.continueWithGoogle').closest('a')).toHaveAttribute('href', '/register?via=google');
    });

    it('offers the role as links on the way to Apple', () => {
        query = 'via=apple';
        render(<RegisterPage />);
        expect(screen.getByRole('link', { name: /auth.iWantToWork/ })).toHaveAttribute('href', '/api/auth/apple?role=provider');
        expect(screen.queryByLabelText('auth.fullName')).toBeNull();
    });
});

describe('/register?redirect=', () => {
    it('keeps the target on the links to login and to Google', () => {
        query = 'type=customer&redirect=%2Fcreate-task';
        render(<RegisterPage />);
        expect(screen.getByText('common.login').closest('a')).toHaveAttribute('href', '/login?redirect=%2Fcreate-task');
        expect(screen.getByText('auth.continueWithGoogle').closest('a'))
            .toHaveAttribute('href', '/api/auth/google?role=customer&redirect=%2Fcreate-task');
    });
});
