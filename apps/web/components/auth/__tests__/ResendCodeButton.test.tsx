import { render, screen, fireEvent, act } from '@testing-library/react';
import ResendCodeButton from '../ResendCodeButton';
import { formatCountdown } from '@/lib/useResendCooldown';

jest.mock('@/lib/i18n', () => {
    const i18n = {
        t: (k: string, p?: Record<string, string>) => (p?.time ? `${k} ${p.time}` : k),
        locale: 'ru',
    };
    return { useTranslation: () => i18n };
});

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const button = () => screen.getByRole('button');

describe('ResendCodeButton', () => {
    it('waits 60 seconds after a code went out, counting down', () => {
        render(<ResendCodeButton onResend={jest.fn()} />);
        expect(button()).toBeDisabled();
        expect(button()).toHaveTextContent('auth.resendCodeIn 1:00');

        act(() => { jest.advanceTimersByTime(18_000); });
        expect(button()).toHaveTextContent('auth.resendCodeIn 0:42');

        act(() => { jest.advanceTimersByTime(42_000); });
        expect(button()).toBeEnabled();
        expect(button()).toHaveTextContent('auth.resendCode');
    });

    it('is disabled while sending, then starts a new countdown', async () => {
        let finish!: (ok: boolean) => void;
        const onResend = jest.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
        render(<ResendCodeButton onResend={onResend} />);
        act(() => { jest.advanceTimersByTime(60_000); });

        fireEvent.click(button());
        expect(button()).toBeDisabled();
        expect(button()).toHaveTextContent('auth.resendSending');
        fireEvent.click(button());
        expect(onResend).toHaveBeenCalledTimes(1);

        await act(async () => { finish(true); });
        expect(button()).toHaveTextContent('auth.resendCodeIn 1:00');
        expect(button()).toBeDisabled();
    });

    it('lets them try again at once when the send failed', async () => {
        render(<ResendCodeButton onResend={jest.fn(async () => false)} />);
        act(() => { jest.advanceTimersByTime(60_000); });
        await act(async () => { fireEvent.click(button()); });
        expect(button()).toBeEnabled();
        expect(button()).toHaveTextContent('auth.resendCode');
    });

    it('stays disabled while the form is busy', () => {
        render(<ResendCodeButton onResend={jest.fn()} disabled />);
        act(() => { jest.advanceTimersByTime(60_000); });
        expect(button()).toBeDisabled();
    });
});

describe('formatCountdown', () => {
    it('shows minutes and two-digit seconds', () => {
        expect(formatCountdown(60)).toBe('1:00');
        expect(formatCountdown(42)).toBe('0:42');
        expect(formatCountdown(5)).toBe('0:05');
        expect(formatCountdown(0)).toBe('0:00');
    });
});
