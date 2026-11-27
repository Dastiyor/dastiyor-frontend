import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { api } from '@/lib/api-client';
import { Alert } from '@/lib/dialog';
import { getTranslations } from '@/lib/i18n';
import CreateTaskScreen from '@/app/create-task';

let mockRouteParams: { category?: string } = {};
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => mockRouteParams }));
jest.mock('@/lib/nav', () => ({ goBack: jest.fn(), replaceFromModal: jest.fn() }));
jest.mock('@/lib/api-client', () => ({ api: { post: jest.fn() } }));
jest.mock('@/lib/dialog', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('@/lib/analytics', () => ({ track: jest.fn(), AnalyticsEvent: {} }));
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
  beforeEach(() => { jest.clearAllMocks(); mockRouteParams = {}; });

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
