import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProviderEditProfilePage from '../page';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

// Tajik display labels, so the test can tell a shown label from a sent value.
jest.mock('@/lib/i18n', () => {
    const TJ: Record<string, string> = { 'Ремонт': 'Таъмир', 'Уборка': 'Тозакунӣ', 'Худжанд': 'Хуҷанд' };
    const i18n = { t: (k: string) => k, tr: (v: string) => TJ[v] ?? v, tError: (m: string) => m, locale: 'tj' };
    return { useTranslation: () => i18n };
});

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;
const json = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

const provider = {
    id: 'u1', fullName: 'Ali', email: 'a@b.tj', phone: null, bio: '', skills: '', avatar: null, role: 'PROVIDER',
    experienceYears: 3, city: 'Душанбе', categories: ['Уборка'],
};

describe('ProviderEditProfilePage provider fields', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        fetchMock.mockImplementation((url: string) => {
            if (url === '/api/profile') return json({ user: provider });
            if (url === '/api/config') return json({ categories: ['Ремонт', 'Уборка'], cities: ['Душанбе', 'Худжанд'] });
            return json({});
        });
    });

    it('loads experience, city and categories, showing translated labels', async () => {
        render(<ProviderEditProfilePage />);

        expect(await screen.findByLabelText('profileEdit.experience')).toHaveValue(3);
        expect(screen.getByLabelText('profileEdit.city')).toHaveValue('Душанбе');
        expect(screen.getByRole('option', { name: 'Хуҷанд' })).toHaveValue('Худжанд');
        expect(screen.getByRole('checkbox', { name: 'Тозакунӣ' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Таъмир' })).not.toBeChecked();
    });

    it('sends canonical Russian values, not the translated labels', async () => {
        render(<ProviderEditProfilePage />);
        await screen.findByLabelText('profileEdit.experience');

        fireEvent.change(screen.getByLabelText('profileEdit.experience'), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText('profileEdit.city'), { target: { value: 'Худжанд' } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'Таъмир' }));
        fireEvent.click(screen.getByRole('button', { name: 'profile.saveChanges' }));

        await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true));
        const [, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'PUT');
        expect(JSON.parse(init.body)).toEqual(expect.objectContaining({
            experienceYears: 10, city: 'Худжанд', categories: ['Уборка', 'Ремонт'],
        }));
    });

    it('sends null for an empty experience and no city', async () => {
        render(<ProviderEditProfilePage />);
        await screen.findByLabelText('profileEdit.experience');

        fireEvent.change(screen.getByLabelText('profileEdit.experience'), { target: { value: '' } });
        fireEvent.change(screen.getByLabelText('profileEdit.city'), { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: 'profile.saveChanges' }));

        await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true));
        const [, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'PUT');
        expect(JSON.parse(init.body)).toEqual(expect.objectContaining({ experienceYears: null, city: null }));
    });

    it('stops at 5 categories', async () => {
        fetchMock.mockImplementation((url: string) => {
            if (url === '/api/profile') return json({ user: { ...provider, categories: ['a', 'b', 'c', 'd', 'e'] } });
            if (url === '/api/config') return json({ categories: ['a', 'b', 'c', 'd', 'e', 'f'], cities: [] });
            return json({});
        });
        render(<ProviderEditProfilePage />);

        expect(await screen.findByRole('checkbox', { name: 'f' })).toBeDisabled();
        expect(screen.getByRole('checkbox', { name: 'a' })).not.toBeDisabled();
    });
});
