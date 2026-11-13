import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { api } from '@/lib/api-client';
import { CurrentPlanCard } from '../CurrentPlanCard';

const get = api.get as jest.Mock;
const labels = { current: 'Current plan', until: 'Active until' };
const setup = () => render(<CurrentPlanCard labels={labels} locale="ru" />, {
  wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
});

describe('CurrentPlanCard', () => {
  beforeEach(() => get.mockReset());

  it('shows an active plan bought elsewhere, with no way to buy or link out', async () => {
    get.mockResolvedValue({ subscription: { plan: 'pro_plus', isCurrentlyActive: true, endDate: '2026-12-13T00:00:00.000Z', source: 'web' } });
    const screen = setup();
    await waitFor(() => expect(screen.getByText('Current plan: PRO+')).toBeTruthy());
    // DD.MM.YYYY whatever the phone's own language (the emulator showed 12/13/2026)
    expect(screen.getByText(/^Active until \d{2}\.12\.2026$/)).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(get).toHaveBeenCalledWith('/api/subscription');
  });

  it('renders nothing on FREE, for an ended plan, or when the request fails', async () => {
    get.mockResolvedValueOnce({ subscription: null });
    const free = setup();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    expect(free.toJSON()).toBeNull();

    get.mockResolvedValueOnce({ subscription: { plan: 'pro', isCurrentlyActive: false, endDate: '2026-10-01T00:00:00.000Z' } });
    const ended = setup();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(ended.toJSON()).toBeNull();

    get.mockRejectedValueOnce(new Error('offline'));
    const failed = setup();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3));
    expect(failed.toJSON()).toBeNull();
  });
});
