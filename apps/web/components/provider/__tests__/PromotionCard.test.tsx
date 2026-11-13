import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { PromotionStatus } from '@dastiyor/types';
import PromotionCard, { formatDushanbe } from '../PromotionCard';

jest.mock('@/lib/i18n', () => {
    const TJ: Record<string, string> = { 'Ремонт': 'Таъмир', 'Уборка': 'Тозакунӣ' };
    const i18n = {
        t: (key: string, params?: Record<string, string | number>) => params ? `${key} ${JSON.stringify(params)}` : key,
        tr: (v: string) => TJ[v] ?? v,
        tError: (m: string | undefined) => (m ? `tj:${m}` : ''),
        locale: 'tj',
    };
    return { useTranslation: () => i18n };
});

const base: PromotionStatus = {
    plan: 'business', limit: 5, used: 1, remaining: 4,
    periodStart: '2026-10-31T00:00:00.000Z', periodEnd: '2026-11-30T00:00:00.000Z',
    promotion: null, pin: null, canPin: true,
    pinSlots: [
        { category: 'Ремонт', taken: 3, nextFreeAt: '2026-11-20T18:00:00.000Z' },
        { category: 'Уборка', taken: 0, nextFreeAt: null },
    ],
};

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;
const reply = (body: unknown, ok = true) => fetchMock.mockResolvedValueOnce({ ok, json: () => Promise.resolve(body) });

describe('PromotionCard', () => {
    beforeEach(() => fetchMock.mockReset());

    it('formats in Dushanbe time (UTC+5)', () => {
        expect(formatDushanbe('2026-11-20T18:00:00.000Z')).toBe('20.11, 23:00');
    });

    it('shows credits and the reset date', () => {
        render(<PromotionCard initial={base} />);
        expect(screen.getByText('promotions.credits {"remaining":4,"limit":5}')).toBeInTheDocument();
        expect(screen.getByText(`promotions.resets {"date":"${formatDushanbe(base.periodEnd!)}"}`)).toBeInTheDocument();
    });

    it('starts a promotion and shows its end', async () => {
        const endsAt = '2026-11-21T12:00:00.000Z';
        reply({ promotion: {}, status: { ...base, remaining: 3, promotion: { id: 'p', category: null, startsAt: '', endsAt } } });
        render(<PromotionCard initial={base} />);

        fireEvent.click(screen.getByText('promotions.promote'));

        expect(await screen.findByText(`promotions.activeUntil {"date":"${formatDushanbe(endsAt)}"}`)).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledWith('/api/promotions', expect.objectContaining({ method: 'POST', body: '{}' }));
        expect(screen.queryByText('promotions.promote')).not.toBeInTheDocument();
    });

    it('pins in the chosen category, sending the canonical Russian name; full categories are disabled', async () => {
        reply({ promotion: {}, status: { ...base, pin: { id: 'p', category: 'Уборка', startsAt: '', endsAt: '2026-11-21T12:00:00.000Z' } } });
        render(<PromotionCard initial={base} />);

        const full = screen.getByRole('option', { name: /Таъмир/ }) as HTMLOptionElement;
        expect(full.disabled).toBe(true);
        expect(full.textContent).toContain('promotions.slotFull');
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('Уборка');

        fireEvent.click(screen.getByText('promotions.pin'));

        await waitFor(() => expect(screen.getByText(/promotions.pinnedUntil/)).toHaveTextContent('Тозакунӣ'));
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ category: 'Уборка' });
    });

    it('shows the translated server error and when the next slot frees up', async () => {
        reply({ error: 'В этой категории уже закреплены 3 исполнителя', nextFreeAt: '2026-11-20T18:00:00.000Z' }, false);
        render(<PromotionCard initial={base} />);
        fireEvent.click(screen.getByText('promotions.pin'));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            `tj:В этой категории уже закреплены 3 исполнителя promotions.nextSlot {"date":"${formatDushanbe('2026-11-20T18:00:00.000Z')}"}`,
        );
    });

    it('falls back to a generic error for a bodyless failure or a network error', async () => {
        fetchMock.mockResolvedValueOnce({ ok: false, json: () => Promise.reject(new Error('html')) });
        render(<PromotionCard initial={base} />);
        fireEvent.click(screen.getByText('promotions.promote'));
        expect(await screen.findByRole('alert')).toHaveTextContent('common.somethingWentWrong');

        fetchMock.mockRejectedValueOnce(new Error('offline'));
        fireEvent.click(screen.getByText('promotions.promote'));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        expect(await screen.findByRole('alert')).toHaveTextContent('common.somethingWentWrong');
    });

    it('disables the buttons when no credits are left', () => {
        render(<PromotionCard initial={{ ...base, remaining: 0 }} />);
        expect(screen.getByText('promotions.promote')).toBeDisabled();
        expect(screen.getByText('promotions.pin')).toBeDisabled();
    });

    it('below BUSINESS: no pin section; BUSINESS without categories: a hint', () => {
        const { unmount } = render(<PromotionCard initial={{ ...base, canPin: false, pinSlots: [] }} />);
        expect(screen.queryByText('promotions.pinTitle')).not.toBeInTheDocument();
        unmount();

        render(<PromotionCard initial={{ ...base, pinSlots: [], periodEnd: null }} />);
        expect(screen.getByText('promotions.noCategories')).toBeInTheDocument();
    });

    it('every pin slot full: the pin button is disabled', () => {
        render(<PromotionCard initial={{ ...base, pinSlots: [base.pinSlots[0]] }} />);
        expect(screen.getByText('promotions.pin')).toBeDisabled();
    });
});
