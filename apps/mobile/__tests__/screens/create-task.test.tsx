import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { api } from '@/lib/api-client';
import { Alert } from '@/lib/dialog';
import { getTranslations } from '@/lib/i18n';
import CreateTaskScreen from '@/app/create-task';
import { replaceFromModal } from '@/lib/nav';
import { returnToTaskAfterSignIn } from '@/lib/auth-return';
import { loadTaskDraft, saveTaskDraft, clearTaskDraft } from '@/lib/task-draft';
import { track } from '@/lib/analytics';

let mockRouteParams: { category?: string } = {};
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => mockRouteParams }));
jest.mock('@/lib/nav', () => ({ goBack: jest.fn(), replaceFromModal: jest.fn() }));
jest.mock('@/lib/api-client', () => ({ api: { post: jest.fn() } }));
jest.mock('@/lib/dialog', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('@/lib/analytics', () => ({
  track: jest.fn(),
  AnalyticsEvent: { TaskCreateStarted: 'task_create_started', TaskCreateValidationFailed: 'task_create_validation_failed' },
}));
let mockUser: { role: string } | null = { role: 'CUSTOMER' };
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser, loading: false }) }));
jest.mock('@/lib/auth-return', () => ({ returnToTaskAfterSignIn: jest.fn() }));
jest.mock('@/lib/task-draft', () => ({
  loadTaskDraft: jest.fn(), saveTaskDraft: jest.fn(), clearTaskDraft: jest.fn(),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(), notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {}, NotificationFeedbackType: {},
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/lib/useConfig', () => ({
  useConfig: () => ({ config: { categories: ['Сантехника', 'Уборка'], cities: ['Душанбе', 'Худжанд'] } }),
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: jest.requireActual('@/lib/i18n').getTranslations('en'), tr: (v: string) => v }),
}));

const ct = getTranslations('en').createTask;
const mPost = api.post as jest.Mock;

const setup = () => render(<CreateTaskScreen />, { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> });

describe('CreateTaskScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockUser = { role: 'CUSTOMER' };
    (loadTaskDraft as jest.Mock).mockResolvedValue(null);
    (saveTaskDraft as jest.Mock).mockResolvedValue(undefined);
  });

  const saved = { title: 'Починить кран', description: 'Течёт', category: 'Сантехника', city: 'Худжанд', budgetType: 'fixed', amount: '50', urgency: 'urgent', address: 'ул. Рудаки' };

  it('brings back the saved draft and publishes it, then forgets it', async () => {
    (loadTaskDraft as jest.Mock).mockResolvedValue(saved);
    mPost.mockResolvedValue({ task: { id: 't1' } });
    const { getByLabelText, findByDisplayValue, unmount } = setup();
    await findByDisplayValue('Починить кран');
    fireEvent.press(getByLabelText(ct.publish));
    await waitFor(() => expect(clearTaskDraft).toHaveBeenCalled());
    expect(mPost).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
      title: 'Починить кран', city: 'Худжанд', budget: 'fixed', amount: 50, urgency: 'urgent', address: 'ул. Рудаки',
    }));
    (saveTaskDraft as jest.Mock).mockClear();
    unmount(); // must not write the published task back
    expect(saveTaskDraft).not.toHaveBeenCalled();
  });

  it('keeps the category it was opened with over the draft', async () => {
    mockRouteParams = { category: 'Уборка' };
    (loadTaskDraft as jest.Mock).mockResolvedValue(saved);
    mPost.mockResolvedValue({ task: { id: 't1' } });
    const { getByLabelText, findByDisplayValue } = setup();
    await findByDisplayValue('Починить кран');
    fireEvent.press(getByLabelText(ct.publish));
    await waitFor(() => expect(mPost).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({ category: 'Уборка' })));
  });

  it('saves what was typed when the form is closed', async () => {
    const { getByLabelText, unmount } = setup();
    await waitFor(() => expect(loadTaskDraft).toHaveBeenCalled());
    fireEvent.changeText(getByLabelText(ct.titleLabel), 'Помыть окна');
    unmount();
    expect(saveTaskDraft).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Помыть окна' }));
  });

  it('does not rewrite an already saved draft on closing', async () => {
    jest.useFakeTimers();
    const { getByLabelText, unmount } = setup();
    await act(async () => {});
    fireEvent.changeText(getByLabelText(ct.titleLabel), 'Помыть окна');
    act(() => { jest.advanceTimersByTime(500); });
    expect(saveTaskDraft).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Помыть окна' }));
    (saveTaskDraft as jest.Mock).mockClear();
    unmount(); // another copy of the form may have published and cleared it since
    expect(saveTaskDraft).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('sends a guest to sign up at Publish, keeping the task', async () => {
    mockUser = null;
    const { getByLabelText, getByText } = setup();
    fireEvent.changeText(getByLabelText(ct.titleLabel), 'Починить кран');
    fireEvent.press(getByText('Сантехника'));
    fireEvent.press(getByLabelText(ct.publish));
    await waitFor(() => expect(replaceFromModal).toHaveBeenCalledWith('/(auth)/register'));
    expect(saveTaskDraft).toHaveBeenCalledWith(expect.objectContaining({ title: 'Починить кран', category: 'Сантехника' }));
    expect(returnToTaskAfterSignIn).toHaveBeenCalled();
    expect(mPost).not.toHaveBeenCalled();
  });

  it('marks a start that resumed a draft', async () => {
    (loadTaskDraft as jest.Mock).mockResolvedValue(saved);
    setup();
    await waitFor(() => expect(track).toHaveBeenCalledWith('task_create_started', { resumed: true }));
  });

  it("records the server's own Russian text when it refuses a task", async () => {
    mPost.mockRejectedValue(Object.assign(new Error('Unknown city'), { status: 400, serverError: 'Неизвестный город' }));
    const { getByLabelText, getByText } = setup();
    fireEvent.changeText(getByLabelText(ct.titleLabel), 'Починить кран');
    fireEvent.press(getByText('Сантехника'));
    fireEvent.press(getByLabelText(ct.publish));
    await waitFor(() => expect(track).toHaveBeenCalledWith('task_create_validation_failed', { field: 'server', rule: 'Неизвестный город' }));
  });

  it('records which rules stopped publishing', () => {
    const { getByLabelText } = setup();
    fireEvent.press(getByLabelText(ct.publish));
    expect(track).toHaveBeenCalledWith('task_create_validation_failed', { field: 'title', rule: 'title_too_short' });
    expect(track).toHaveBeenCalledWith('task_create_validation_failed', { field: 'category', rule: 'category_missing' });
  });

  it('shows every problem under its field at once, with no pop-up and no request', () => {
    const { getByText, queryByText, getByLabelText } = setup();
    fireEvent.press(getByText(ct.fixed)); // a fixed price needs an amount
    fireEvent.press(getByLabelText(ct.publish));
    expect(getByText(ct.errTitleShort)).toBeTruthy();
    expect(getByText(ct.errCategory)).toBeTruthy();
    expect(getByText(ct.errBudget)).toBeTruthy();
    expect(queryByText(ct.errCity)).toBeNull(); // Душанбе is preselected
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mPost).not.toHaveBeenCalled();
  });

  it('waits until the title is left before complaining, then follows typing', () => {
    const { getByLabelText, queryByText } = setup();
    const title = getByLabelText(ct.titleLabel);
    fireEvent.changeText(title, 'Кран');
    expect(queryByText(ct.errTitleShort)).toBeNull();
    fireEvent(title, 'blur');
    expect(queryByText(ct.errTitleShort)).toBeTruthy();
    fireEvent.changeText(title, 'Кран течёт');
    expect(queryByText(ct.errTitleShort)).toBeNull();
    expect(queryByText(`${'Кран течёт'.length}/200`)).toBeTruthy();
  });

  it('publishes without a description, in Душанбе by default', async () => {
    mPost.mockResolvedValue({ task: { id: 't1' } });
    const { getByLabelText, getByText } = setup();
    fireEvent.changeText(getByLabelText(ct.titleLabel), 'Починить кран');
    fireEvent.press(getByText('Сантехника'));
    fireEvent.press(getByText(ct.negotiable));
    fireEvent.press(getByLabelText(ct.publish));
    await waitFor(() => expect(mPost).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
      title: 'Починить кран', description: '', category: 'Сантехника', city: 'Душанбе', budget: 'negotiable',
    })));
  });

  it('opens on the category the empty feed was showing', async () => {
    mockRouteParams = { category: 'Уборка' };
    mPost.mockResolvedValue({ task: { id: 't1' } });
    const { getByLabelText, getByText } = setup();
    fireEvent.changeText(getByLabelText(ct.titleLabel), 'Помыть окна');
    fireEvent.press(getByText(ct.negotiable));
    fireEvent.press(getByLabelText(ct.publish));
    await waitFor(() => expect(mPost).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({ category: 'Уборка' })));
  });

  it('starts on negotiable, so no amount is asked for', async () => {
    mPost.mockResolvedValue({ task: { id: 't1' } });
    const { getByLabelText, getByText, queryByLabelText } = setup();
    expect(queryByLabelText(ct.amountPh)).toBeNull();
    fireEvent.changeText(getByLabelText(ct.titleLabel), 'Починить кран');
    fireEvent.press(getByText('Сантехника'));
    fireEvent.press(getByLabelText(ct.publish));
    await waitFor(() => expect(mPost).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({ budget: 'negotiable' })));
  });
});
