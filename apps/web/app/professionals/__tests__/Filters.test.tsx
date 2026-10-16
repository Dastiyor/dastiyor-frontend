import { render, screen, fireEvent } from '@testing-library/react';
import Filters from '../Filters';

const replace = jest.fn();
let current = new URLSearchParams();
jest.mock('next/navigation', () => ({
    useRouter: () => ({ replace }),
    useSearchParams: () => current,
}));
jest.mock('@/lib/i18n', () => {
    const TJ: Record<string, string> = { 'Ремонт': 'Таъмир', 'Худжанд': 'Хуҷанд' };
    const i18n = { t: (k: string) => k, tr: (v: string) => TJ[v] ?? v, locale: 'tj' };
    return { useTranslation: () => i18n };
});

const renderFilters = () => render(<Filters categories={['Ремонт', 'Уборка']} cities={['Душанбе', 'Худжанд']} />);
const lastUrl = () => replace.mock.calls.at(-1)[0] as string;
const lastParams = () => new URLSearchParams(lastUrl().split('?')[1]);

describe('professionals Filters', () => {
    beforeEach(() => {
        replace.mockClear();
        current = new URLSearchParams();
    });

    it('filters write canonical values to the URL', () => {
        renderFilters();
        fireEvent.change(screen.getByLabelText('professionals.category'), { target: { value: 'Ремонт' } });
        expect(lastParams().get('category')).toBe('Ремонт');

        fireEvent.change(screen.getByLabelText('professionals.city'), { target: { value: 'Худжанд' } });
        expect(lastParams().get('city')).toBe('Худжанд');
    });

    it('shows translated labels for options', () => {
        renderFilters();
        expect(screen.getByRole('option', { name: 'Таъмир' })).toHaveValue('Ремонт');
        expect(screen.getByRole('option', { name: 'Хуҷанд' })).toHaveValue('Худжанд');
    });

    it('applies the search text on submit and drops the page', () => {
        current = new URLSearchParams('page=4&sort=reviews');
        renderFilters();
        fireEvent.change(screen.getByLabelText('professionals.searchLabel'), { target: { value: ' сантехник ' } });
        fireEvent.click(screen.getByRole('button', { name: 'professionals.searchBtn' }));

        expect(lastParams().get('q')).toBe('сантехник');
        expect(lastParams().get('sort')).toBe('reviews');
        expect(lastParams().has('page')).toBe(false);
        expect(lastUrl().startsWith('/professionals?')).toBe(true);
    });

    it('removes a filter set back to all', () => {
        current = new URLSearchParams('category=%D0%A0%D0%B5%D0%BC%D0%BE%D0%BD%D1%82');
        renderFilters();
        expect(screen.getByLabelText('professionals.category')).toHaveValue('Ремонт');
        fireEvent.change(screen.getByLabelText('professionals.category'), { target: { value: '' } });
        expect(lastUrl()).toBe('/professionals');
    });

    it('changes the sort', () => {
        renderFilters();
        fireEvent.change(screen.getByLabelText('professionals.sortLabel'), { target: { value: 'completed' } });
        expect(lastParams().get('sort')).toBe('completed');
    });
});
