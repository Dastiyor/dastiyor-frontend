import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../page';

jest.mock('next/navigation', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a> }));
jest.mock('@/lib/i18n', () => {
    const i18n = { t: (k: string) => k, tr: (v: string) => v, tError: (m: string) => `tj:${m}`, locale: 'tj' };
    return { useTranslation: () => i18n };
});
jest.mock('@/lib/useHydrated', () => ({ useHydrated: () => true }));

let loginResponse: { status: number; body: unknown };
const posted: unknown[] = [];
beforeEach(() => {
    posted.length = 0;
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/auth/login') {
            posted.push(JSON.parse(String(init?.body)));
            return { ok: loginResponse.status < 400, status: loginResponse.status, json: async () => loginResponse.body };
        }
        return { ok: false, status: 401, json: async () => ({}) };
    }) as unknown as typeof fetch;
});

async function submit(identifier: string) {
    render(<LoginPage />);
    const field = await screen.findByLabelText('auth.identifierLabel');
    fireEvent.change(field, { target: { value: identifier } });
    fireEvent.change(screen.getByLabelText('auth.passwordLabel'), { target: { value: 'parolparol' } });
    fireEvent.submit(field.closest('form')!);
}

describe('/login', () => {
    it('takes a phone number: the field is text, not email', async () => {
        loginResponse = { status: 401, body: { error: 'Неверный пароль' } };
        await submit(' +992 90 123 4567 ');
        await waitFor(() => expect(posted).toEqual([{ identifier: '+992 90 123 4567', password: 'parolparol' }]));
        expect(screen.getByLabelText('auth.identifierLabel')).toHaveAttribute('type', 'text');
    });

    it('offers signup when the number has no account', async () => {
        loginResponse = { status: 401, body: { error: 'Этот номер не зарегистрирован', code: 'ACCOUNT_NOT_FOUND' } };
        await submit('+992901234567');
        expect(await screen.findByText('tj:Этот номер не зарегистрирован.')).toBeInTheDocument();
        expect(screen.getByText('auth.createAccountQuestion').closest('a')).toHaveAttribute('href', '/register');
    });

    it('offers no signup link for a wrong password', async () => {
        loginResponse = { status: 401, body: { error: 'Неверный пароль' } };
        await submit('+992901234567');
        expect(await screen.findByText('tj:Неверный пароль')).toBeInTheDocument();
        expect(screen.queryByText('auth.createAccountQuestion')).toBeNull();
    });
});
