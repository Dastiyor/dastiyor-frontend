import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SourcingForm from '../SourcingForm';

jest.mock('@/lib/i18n', () => {
    const TJ: Record<string, string> = { 'Ремонт': 'Таъмир', 'Худжанд': 'Хуҷанд' };
    const i18n = { t: (k: string) => k, tr: (v: string) => TJ[v] ?? v, tError: (m: string) => `tj:${m}`, locale: 'tj' };
    return { useTranslation: () => i18n };
});

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;
const json = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });
const mine = { id: 'sr1', category: 'Ремонт', city: 'Худжанд', headcount: 3, status: 'PROPOSED', createdAt: '2026-10-16T00:00:00Z', proposed: [{ id: 'p1', fullName: 'Ali' }] };

const fill = () => {
    fireEvent.change(screen.getByLabelText(/^sourcing\.category/), { target: { value: 'Ремонт' } });
    fireEvent.change(screen.getByLabelText(/^sourcing\.city/), { target: { value: 'Худжанд' } });
    fireEvent.change(screen.getByLabelText(/^sourcing\.headcount/), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/^sourcing\.description/), { target: { value: 'Нужны три мастера для ремонта офиса.' } });
    fireEvent.change(screen.getByLabelText(/^sourcing\.contactName/), { target: { value: 'ООО Пример' } });
    fireEvent.change(screen.getByLabelText(/^sourcing\.contactPhone/), { target: { value: '+992935001234' } });
};
const renderForm = () => render(<SourcingForm categories={['Ремонт', 'Уборка']} cities={['Душанбе', 'Худжанд']} />);
const posted = () => JSON.parse(fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')[1].body);

describe('SourcingForm', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        fetchMock.mockImplementation((_u: string, init?: RequestInit) => (init?.method === 'POST' ? json({ request: { ...mine, id: 'sr2', status: 'NEW', proposed: [] } }, true) : json({ requests: [mine] })));
    });

    it('is a POST form so nothing ends up in the URL before hydration', () => {
        const { container } = renderForm();
        expect(container.querySelector('form')).toHaveAttribute('method', 'post');
    });

    it('lists my requests with the proposed professionals linked', async () => {
        renderForm();
        expect(await screen.findByRole('link', { name: 'Ali' })).toHaveAttribute('href', '/provider/p1');
        expect(screen.getByText('sourcing.status_PROPOSED')).toBeInTheDocument();
    });

    it('sends canonical values and numbers', async () => {
        renderForm();
        fill();
        fireEvent.change(screen.getByLabelText(/^sourcing\.experienceYears/), { target: { value: '2' } });
        fireEvent.click(screen.getByRole('button', { name: 'sourcing.submit' }));

        await waitFor(() => expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'POST')).toBe(true));
        expect(posted()).toEqual(expect.objectContaining({
            category: 'Ремонт', city: 'Худжанд', headcount: 3, experienceYears: 2, contactName: 'ООО Пример', contactPhone: '+992935001234',
        }));
        expect(posted().budget).toBeUndefined();
        expect(await screen.findByText('sourcing.sent')).toBeInTheDocument();
    });

    it('shows translated option labels', () => {
        renderForm();
        expect(screen.getByRole('option', { name: 'Таъмир' })).toHaveValue('Ремонт');
    });

    it('shows the translated server error', async () => {
        fetchMock.mockImplementation((_u: string, init?: RequestInit) => (init?.method === 'POST' ? json({ error: 'Текст похож на спам' }, false) : json({ requests: [] })));
        renderForm();
        fill();
        fireEvent.click(screen.getByRole('button', { name: 'sourcing.submit' }));
        expect(await screen.findByText('tj:Текст похож на спам')).toBeInTheDocument();
    });
});
