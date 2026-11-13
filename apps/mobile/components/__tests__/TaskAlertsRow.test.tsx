import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { api } from '@/lib/api-client';
import { Alert } from '@/lib/dialog';
import { getTranslations } from '@/lib/i18n';
import { TaskAlertsRow } from '../TaskAlertsRow';

jest.mock('@/lib/api-client', () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) { super(message); this.status = status; }
  }
  return { api: { get: jest.fn(), put: jest.fn() }, ApiError };
});
jest.mock('@/lib/dialog', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: jest.requireActual('@/lib/i18n').getTranslations('en') }),
}));

const mApi = api as jest.Mocked<typeof api>;
const s = getTranslations('en').taskAlerts;
const { ApiError } = jest.requireMock('@/lib/api-client');

const setup = () =>
  render(<TaskAlertsRow />, { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> });

describe('TaskAlertsRow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing until the server answers, and nothing if it fails', async () => {
    mApi.get.mockRejectedValue(new Error('offline'));
    const { queryByText } = setup();
    await waitFor(() => expect(mApi.get).toHaveBeenCalledWith('/api/profile/task-alerts'));
    expect(queryByText(s.title)).toBeNull();
  });

  it.each([
    ['free', s.hintFree],
    ['pro', s.hintPro],
    ['pro_plus', s.hintInstant],
    ['business', s.hintInstant],
  ])('explains when alerts arrive on %s', async (plan, hint) => {
    mApi.get.mockResolvedValue({ enabled: true, plan });
    const { findByText } = setup();
    expect(await findByText(hint)).toBeTruthy();
  });

  it('saves the switch', async () => {
    mApi.get.mockResolvedValue({ enabled: true, plan: 'pro' });
    mApi.put.mockResolvedValue({ enabled: false, plan: 'pro' });
    const { findByLabelText } = setup();
    const sw = await findByLabelText(s.title);

    fireEvent(sw, 'valueChange', false);

    await waitFor(() => expect(mApi.put).toHaveBeenCalledWith('/api/profile/task-alerts', { enabled: false }));
    await waitFor(() => expect(sw.props.value).toBe(false));
  });

  it('puts the switch back and shows the error when saving fails', async () => {
    mApi.get.mockResolvedValue({ enabled: true, plan: 'business' });
    mApi.put
      .mockRejectedValueOnce(new ApiError('Invalid setting value', 400))
      .mockRejectedValueOnce(new Error('offline'));
    const { findByLabelText } = setup();
    const sw = await findByLabelText(s.title);

    fireEvent(sw, 'valueChange', false);
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(s.title, 'Invalid setting value'));
    expect(sw.props.value).toBe(true);

    fireEvent(sw, 'valueChange', false);
    await waitFor(() => expect(Alert.alert).toHaveBeenLastCalledWith(s.title, s.saveError));
    expect(sw.props.value).toBe(true);
  });

  it('ignores a late answer after unmounting', async () => {
    let resolve!: (v: unknown) => void;
    mApi.get.mockReturnValue(new Promise((r) => { resolve = r; }) as never);
    const { unmount } = setup();
    unmount();
    resolve({ enabled: true, plan: 'pro' });
    await Promise.resolve();
  });
});
