import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../page';

let query = '';
jest.mock('next/navigation', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
    useSearchParams: () => new URLSearchParams(query),
}));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a> }));
jest.mock('@/lib/i18n', () => {
    const i18n = { t: (k: string) => k, tr: (v: string) => v, tError: (m: string) => `tj:${m}`, locale: 'tj' };
    return { useTranslation: () => i18n };
});
jest.mock('@/lib/useHydrated', () => ({ useHydrated: () => true, useAdoptTypedValue: () => {} }));

let loginResponse: { status: number; body: unknown };
let sendResponse: { status: number; body: unknown };
const posted: unknown[] = [];
beforeEach(() => {
    posted.length = 0;
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/auth/login') {
            posted.push(JSON.parse(String(init?.body)));
            return { ok: loginResponse.status < 400, status: loginResponse.status, json: async () => loginResponse.body };
        }
        if (url === '/api/auth/verify-send' || url === '/api/auth/login/code') {
            posted.push(JSON.parse(String(init?.body)));
            const res = url === '/api/auth/verify-send' ? sendResponse : loginResponse;
            return { ok: res.status < 400, status: res.status, json: async () => res.body };
        }
        return { ok: false, status: 401, json: async () => ({}) };
    }) as unknown as typeof fetch;
});

async function submit(identifier: string) {
    query = 'method=password';
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

    async function requestCode() {
        query = '';
        render(<LoginPage />);
        const field = await screen.findByLabelText('auth.phone');
        fireEvent.change(field, { target: { value: '901234567' } });
        fireEvent.submit(field.closest('form')!);
    }

    it('signs in with a phone number and an SMS code, no password', async () => {
        sendResponse = { status: 200, body: {} };
        loginResponse = { status: 400, body: { error: 'Неверный или просроченный код' } };
        await requestCode();
        const code = await screen.findByLabelText('auth.verifyPhoneCodeLabel');
        expect(screen.queryByLabelText('auth.passwordLabel')).toBeNull();
        // Resend is on its countdown straight after the first code
        expect(screen.getByRole('button', { name: 'auth.resendCodeIn' })).toBeDisabled();
        fireEvent.change(code, { target: { value: '123456' } });
        fireEvent.submit(code.closest('form')!);
        expect(await screen.findByText('tj:Неверный или просроченный код')).toBeInTheDocument();
        expect(posted).toEqual([
            { phone: '+992901234567', type: 'LOGIN' },
            { phone: '+992901234567', code: '123456' },
        ]);
    });

    it('offers signup instead of sending a code to an unknown number', async () => {
        sendResponse = { status: 404, body: { error: 'Этот номер не зарегистрирован', code: 'ACCOUNT_NOT_FOUND' } };
        await requestCode();
        expect(await screen.findByText('auth.createAccountQuestion')).toBeInTheDocument();
        expect(screen.queryByLabelText('auth.verifyPhoneCodeLabel')).toBeNull();
    });
});
