import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import CreateTaskPage from '../page';

const push = jest.fn();
const track = jest.fn();
jest.mock('@/lib/analytics', () => ({
    ...jest.requireActual('@/lib/analytics'),
    track: (...args: unknown[]) => track(...args),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: jest.fn() }) }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
jest.mock('@/components/ui/Toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));
jest.mock('@/lib/i18n', () => {
    const i18n = { t: (k: string) => k, tr: (v: string) => v, tError: (m: string) => m, locale: 'ru' };
    return { useTranslation: () => i18n };
});

const fetchMock = jest.fn();
let taskPosts: unknown[] = [];

beforeEach(() => {
    localStorage.clear();
    taskPosts = [];
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        if (url === '/api/config') return { ok: true, json: async () => ({ categories: ['Сантехника', 'Уборка'] }) };
        if (url === '/api/tasks') {
            taskPosts.push(JSON.parse(String(init?.body)));
            return { status: 201, ok: true, json: async () => ({ task: { id: 't1' } }) };
        }
        throw new Error(`unexpected fetch ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
});

async function renderForm() {
    render(<CreateTaskPage />);
    return screen.findByLabelText('createTask.taskTitleLabel');
}

describe('/create-task', () => {
    it('starts on Душанбе, the canonical value the API accepts', async () => {
        await renderForm();
        expect(screen.getByLabelText('createTask.cityLabel')).toHaveValue('Душанбе');
    });

    it('replaces the Latin city of an old draft', async () => {
        localStorage.setItem('task_draft', JSON.stringify({ title: 'Старый черновик', city: 'Dushanbe' }));
        await renderForm();
        expect(screen.getByLabelText('createTask.cityLabel')).toHaveValue('Душанбе');
        expect(screen.getByLabelText('createTask.taskTitleLabel')).toHaveValue('Старый черновик');
    });

    it('shows each error beside its field and sends nothing', async () => {
        await renderForm();
        fireEvent.click(screen.getByText('createTask.publish'));
        expect(screen.getByText('createTask.errTitleShort')).toBeInTheDocument();
        expect(screen.getByText('createTask.errCategory')).toBeInTheDocument();
        expect(screen.queryByText('createTask.errCity')).toBeNull();
        expect(screen.getByLabelText('createTask.taskTitleLabel')).toHaveFocus();
        expect(taskPosts).toHaveLength(0);
    });

    it('shows a title error after leaving the field, and clears it while typing', async () => {
        const title = await renderForm();
        fireEvent.change(title, { target: { value: 'Кран' } });
        expect(screen.queryByText('createTask.errTitleShort')).toBeNull();
        fireEvent.blur(title);
        expect(screen.getByText('createTask.errTitleShort')).toBeInTheDocument();
        fireEvent.change(title, { target: { value: 'Кран течёт' } });
        expect(screen.queryByText('createTask.errTitleShort')).toBeNull();
    });

    it('publishes with a title, category and the default city, no description', async () => {
        jest.useFakeTimers();
        const title = await renderForm();
        fireEvent.change(title, { target: { value: 'Починить кран' } });
        await waitFor(() => expect(screen.getByRole('option', { name: 'Уборка' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText('createTask.category'), { target: { value: 'Сантехника' } });
        await act(async () => { fireEvent.click(screen.getByText('createTask.publish')); });
        expect(taskPosts).toEqual([expect.objectContaining({ title: 'Починить кран', category: 'Сантехника', city: 'Душанбе', description: '', budget: 'negotiable' })]);
        jest.useRealTimers();
    });
});

describe('/create-task from the empty task feed', () => {
    it('preselects the category without calling it a template', async () => {
        const { toast } = jest.requireMock('@/components/ui/Toast');
        window.history.replaceState(null, '', `/create-task?category=${encodeURIComponent('Уборка')}`);
        await renderForm();
        await waitFor(() => expect(screen.getByLabelText('createTask.category')).toHaveValue('Уборка'));
        expect(toast.info).not.toHaveBeenCalled();
        window.history.replaceState(null, '', '/create-task');
    });
});

describe('/create-task budget', () => {
    it('starts on negotiable, and asks for an amount once "Фикс. цена" is picked', async () => {
        const title = await renderForm();
        fireEvent.change(title, { target: { value: 'Починить кран' } });
        await waitFor(() => expect(screen.getByRole('option', { name: 'Уборка' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText('createTask.category'), { target: { value: 'Уборка' } });
        expect(screen.getByPlaceholderText('0.00')).toBeDisabled();

        fireEvent.click(screen.getByText('createTask.fixedPrice'));
        fireEvent.click(screen.getByText('createTask.publish'));
        expect(screen.getByText('createTask.errBudget')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('0.00')).toHaveFocus();
        expect(taskPosts).toHaveLength(0);
    });
});

describe('/create-task as a guest', () => {
    const unauthorized = { status: 401, ok: false, json: async () => ({ error: 'Unauthorized' }) };
    beforeEach(() => {
        push.mockClear();
        fetchMock.mockImplementation(async (url: string) => (url === '/api/config'
            ? { ok: true, json: async () => ({ categories: ['Уборка'] }) }
            : unauthorized));
    });

    it('shows the form, asks to sign in at publish, and still has the draft afterwards', async () => {
        const title = await renderForm();
        expect(push).not.toHaveBeenCalled();
        fireEvent.change(title, { target: { value: 'Починить кран' } });
        await waitFor(() => expect(screen.getByRole('option', { name: 'Уборка' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText('createTask.category'), { target: { value: 'Уборка' } });
        await act(async () => { fireEvent.click(screen.getByText('createTask.publish')); });
        expect(push).toHaveBeenCalledWith('/login?redirect=/create-task');

        // Back from signing in.
        cleanup();
        await renderForm();
        expect(screen.getByLabelText('createTask.taskTitleLabel')).toHaveValue('Починить кран');
        expect(screen.getByLabelText('createTask.category')).toHaveValue('Уборка');
    });

    it('asks to sign in when a photo is added', async () => {
        await renderForm();
        const input = document.querySelector('input[type="file"]')!;
        await act(async () => {
            fireEvent.change(input, { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
        });
        expect(push).toHaveBeenCalledWith('/login?redirect=/create-task');
    });
});

describe('/create-task analytics', () => {
    beforeEach(() => track.mockClear());

    it('records the start, and each rule a publish breaks', async () => {
        await renderForm();
        expect(track).toHaveBeenCalledWith('task_create_started');
        fireEvent.click(screen.getByText('createTask.publish'));
        expect(track).toHaveBeenCalledWith('task_create_validation_failed', { field: 'title', rule: 'title_too_short' });
        expect(track).toHaveBeenCalledWith('task_create_validation_failed', { field: 'category', rule: 'category_missing' });
    });

    it('records a published task', async () => {
        jest.useFakeTimers();
        const title = await renderForm();
        fireEvent.change(title, { target: { value: 'Починить кран' } });
        await waitFor(() => expect(screen.getByRole('option', { name: 'Уборка' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText('createTask.category'), { target: { value: 'Уборка' } });
        await act(async () => { fireEvent.click(screen.getByText('createTask.publish')); });
        expect(track).toHaveBeenCalledWith('task_create_completed', { category: 'Уборка', city: 'Душанбе', budgetType: 'negotiable' });
        jest.useRealTimers();
    });
});
