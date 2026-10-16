import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PortfolioManager from '../PortfolioManager';

// Stable functions, like the real memoized ones from I18nProvider.
jest.mock('@/lib/i18n', () => {
    const i18n = { t: (key: string) => key, tError: (m: string) => m, locale: 'ru' };
    return { useTranslation: () => i18n };
});

const BLOB = 'https://abc.public.blob.vercel-storage.com/uploads/p1.jpg';
const projects = [
    { id: 'a', title: 'Kitchen', description: null, images: [BLOB], order: 0 },
    { id: 'b', title: 'Bathroom', description: 'Tiles', images: [], order: 1 },
];

const json = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });
const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const calls = (method: string) => fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === method);

describe('PortfolioManager', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
            (init?.method ?? 'GET') === 'GET' ? json({ projects }) : json({ ok: true }));
    });

    it('lists the projects from the API', async () => {
        render(<PortfolioManager />);
        expect(await screen.findByText('Kitchen')).toBeInTheDocument();
        expect(screen.getByText('Bathroom')).toBeInTheDocument();
    });

    it('adds a project and lists it', async () => {
        render(<PortfolioManager />);
        await screen.findByText('Kitchen');
        fetchMock.mockImplementationOnce(() =>
            json({ project: { id: 'c', title: 'Roof', description: null, images: [], order: 2 } }));

        fireEvent.click(screen.getByRole('button', { name: 'portfolio.addProject' }));
        fireEvent.change(screen.getByLabelText('portfolio.projectTitle'), { target: { value: 'Roof' } });
        fireEvent.click(screen.getByRole('button', { name: 'portfolio.saveProject' }));

        expect(await screen.findByText('Roof')).toBeInTheDocument();
        const [url, init] = calls('POST')[0];
        expect(url).toBe('/api/profile/portfolio');
        expect(JSON.parse(init.body)).toEqual({ title: 'Roof', description: '', images: [] });
    });

    it('edits a project with PUT', async () => {
        render(<PortfolioManager />);
        await screen.findByText('Kitchen');
        fetchMock.mockImplementationOnce(() => json({ project: { ...projects[0], title: 'Big kitchen' } }));

        fireEvent.click(screen.getAllByRole('button', { name: 'portfolio.edit' })[0]);
        fireEvent.change(screen.getByLabelText('portfolio.projectTitle'), { target: { value: 'Big kitchen' } });
        fireEvent.click(screen.getByRole('button', { name: 'portfolio.saveProject' }));

        expect(await screen.findByText('Big kitchen')).toBeInTheDocument();
        expect(calls('PUT')[0][0]).toBe('/api/profile/portfolio/a');
    });

    it('shows the server error when saving fails', async () => {
        render(<PortfolioManager />);
        await screen.findByText('Kitchen');
        fetchMock.mockImplementationOnce(() => json({ error: 'Не больше 20 проектов в портфолио' }, false));

        fireEvent.click(screen.getByRole('button', { name: 'portfolio.addProject' }));
        fireEvent.change(screen.getByLabelText('portfolio.projectTitle'), { target: { value: 'Roof' } });
        fireEvent.click(screen.getByRole('button', { name: 'portfolio.saveProject' }));

        expect(await screen.findByText('Не больше 20 проектов в портфолио')).toBeInTheDocument();
    });

    it('move up sends PATCH with swapped ids', async () => {
        render(<PortfolioManager />);
        await screen.findByText('Kitchen');

        fireEvent.click(screen.getAllByRole('button', { name: 'portfolio.moveUp' })[1]);

        await waitFor(() => expect(calls('PATCH')).toHaveLength(1));
        expect(JSON.parse(calls('PATCH')[0][1].body)).toEqual({ order: ['b', 'a'] });
        const titles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
        expect(titles).toEqual(['Bathroom', 'Kitchen']);
    });

    it('disables moving the first project up and the last one down', async () => {
        render(<PortfolioManager />);
        await screen.findByText('Kitchen');

        expect(screen.getAllByRole('button', { name: 'portfolio.moveUp' })[0]).toBeDisabled();
        expect(screen.getAllByRole('button', { name: 'portfolio.moveDown' })[1]).toBeDisabled();
    });

    it('delete removes the card after confirming', async () => {
        render(<PortfolioManager />);
        await screen.findByText('Kitchen');

        fireEvent.click(screen.getAllByRole('button', { name: 'portfolio.delete' })[0]);
        fireEvent.click(screen.getByRole('button', { name: 'portfolio.confirmDelete' }));

        await waitFor(() => expect(screen.queryByText('Kitchen')).not.toBeInTheDocument());
        expect(calls('DELETE')[0][0]).toBe('/api/profile/portfolio/a');
    });

    it('uploads a photo and adds it to the project', async () => {
        render(<PortfolioManager />);
        await screen.findByText('Kitchen');
        fetchMock.mockImplementationOnce(() => json({ url: BLOB }));

        fireEvent.click(screen.getByRole('button', { name: 'portfolio.addProject' }));
        const file = new File(['x'], 'p.jpg', { type: 'image/jpeg' });
        fireEvent.change(screen.getByLabelText('portfolio.addPhotos'), { target: { files: [file] } });

        expect(await screen.findByAltText('portfolio.photo 1')).toHaveAttribute('src', BLOB);
        expect(calls('POST')[0][0]).toBe('/api/upload');
    });
});
