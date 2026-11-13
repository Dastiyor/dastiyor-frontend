import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskAlertsSettings from '../TaskAlertsSettings';

jest.mock('@/lib/i18n', () => {
    const i18n = { t: (key: string) => key, tError: (m: string) => `tr:${m}`, locale: 'ru' };
    return { useTranslation: () => i18n };
});
jest.mock('@/components/PushNotificationToggle', () => ({
    __esModule: true,
    default: () => <div data-testid="push-toggle" />,
}));

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;
const reply = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });

describe('TaskAlertsSettings', () => {
    beforeEach(() => fetchMock.mockReset());

    it.each([
        ['free', 'taskAlerts.hintFree'],
        ['pro', 'taskAlerts.hintPro'],
        ['pro_plus', 'taskAlerts.hintInstant'],
        ['business', 'taskAlerts.hintInstant'],
    ] as const)('explains when alerts arrive on %s', (plan, hint) => {
        render(<TaskAlertsSettings initialEnabled plan={plan} />);
        expect(screen.getByText(hint)).toBeInTheDocument();
    });

    it('offers browser push only on a paid plan with alerts on', () => {
        const { rerender } = render(<TaskAlertsSettings initialEnabled plan="free" />);
        expect(screen.queryByTestId('push-toggle')).toBeNull();
        rerender(<TaskAlertsSettings initialEnabled plan="pro" />);
        expect(screen.getByTestId('push-toggle')).toBeInTheDocument();
    });

    it('turns alerts off and back on', async () => {
        fetchMock
            .mockReturnValueOnce(reply({ enabled: false, plan: 'pro' }))
            .mockReturnValueOnce(reply({}));
        render(<TaskAlertsSettings initialEnabled plan="pro" />);
        const sw = screen.getByRole('switch');
        expect(sw).toHaveAttribute('aria-checked', 'true');

        fireEvent.click(sw);
        await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'false'));
        expect(fetchMock).toHaveBeenCalledWith('/api/profile/task-alerts', expect.objectContaining({
            method: 'PUT', body: JSON.stringify({ enabled: false }),
        }));
        expect(screen.queryByTestId('push-toggle')).toBeNull();

        // A reply without the field: trust the value sent
        fireEvent.click(sw);
        await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'true'));
    });

    it('shows the server error, translated, and keeps the old value', async () => {
        fetchMock.mockReturnValueOnce(reply({ error: 'Некорректное значение настройки' }, false));
        render(<TaskAlertsSettings initialEnabled={false} plan="pro" />);
        fireEvent.click(screen.getByRole('switch'));
        expect(await screen.findByRole('alert')).toHaveTextContent('tr:Некорректное значение настройки');
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('falls back to a generic message', async () => {
        fetchMock
            .mockReturnValueOnce(Promise.resolve({ ok: false, json: () => Promise.reject(new Error('no body')) }))
            .mockRejectedValueOnce(new Error('offline'));
        render(<TaskAlertsSettings initialEnabled plan="business" />);

        fireEvent.click(screen.getByRole('switch'));
        expect(await screen.findByRole('alert')).toHaveTextContent('taskAlerts.saveError');

        await waitFor(() => expect(screen.getByRole('switch')).not.toBeDisabled());
        fireEvent.click(screen.getByRole('switch'));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        expect(await screen.findByRole('alert')).toHaveTextContent('taskAlerts.saveError');
    });
});
