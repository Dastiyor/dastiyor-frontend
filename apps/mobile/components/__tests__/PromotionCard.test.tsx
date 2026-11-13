import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { api } from '@/lib/api-client';
import { Alert } from '@/lib/dialog';
import { PromotionCard } from '../PromotionCard';

jest.mock('@/lib/dialog', () => ({ Alert: { alert: jest.fn() } }));

const get = api.get as jest.Mock;
const post = api.post as jest.Mock;

const labels = {
  title: 'Promotion', desc: 'Lifts you', credits: 'Left {remaining} of {limit}', resets: 'Resets {date}',
  activeUntil: 'Promoted until {date}', promote: 'Promote', pinTitle: 'Pin', pinDesc: 'Pin desc', pin: 'Pin it',
  pinnedUntil: 'Pinned in {category} until {date}', slotFull: 'full until {date}', noCategories: 'Add categories',
  started: 'Started', pinned: 'Pinned', error: 'Error',
};
const TJ: Record<string, string> = { 'Ремонт': 'Таъмир', 'Уборка': 'Тозакунӣ' };
const status = {
  plan: 'business', limit: 5, used: 1, remaining: 4,
  periodStart: '2026-10-31T00:00:00.000Z', periodEnd: '2026-11-30T00:00:00.000Z',
  promotion: null, pin: null, canPin: true,
  pinSlots: [
    { category: 'Ремонт', taken: 3, nextFreeAt: '2026-11-20T18:00:00.000Z' },
    { category: 'Уборка', taken: 1, nextFreeAt: null },
  ],
};
const setup = () => render(<PromotionCard labels={labels} tr={(v) => TJ[v] ?? v} />, {
  wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
});

describe('PromotionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue(status);
  });

  it('renders nothing on FREE or on an older server', async () => {
    get.mockResolvedValue({ ...status, plan: null });
    const free = setup();
    await waitFor(() => expect(get).toHaveBeenCalledWith('/api/promotions'));
    expect(free.queryByText('Promotion')).toBeNull();
    free.unmount();

    get.mockRejectedValue(new Error('404'));
    const old = setup();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(old.queryByText('Promotion')).toBeNull();
  });

  it('shows credits, reset date in Dushanbe time, and when full categories free up', async () => {
    const { findByText, getByText } = setup();
    expect(await findByText('Left 4 of 5')).toBeTruthy();
    expect(getByText('Resets 30.11 05:00')).toBeTruthy();
    expect(getByText('Таъмир: full until 20.11 23:00')).toBeTruthy();
    // only categories with a free slot are offered
    expect(getByText('Тозакунӣ')).toBeTruthy();
  });

  it('promotes and shows the end time', async () => {
    post.mockResolvedValue({ status: { ...status, remaining: 3, promotion: { id: 'p', category: null, startsAt: '', endsAt: '2026-11-21T12:00:00.000Z' } } });
    const { findByText } = setup();
    fireEvent.press(await findByText('Promote'));

    expect(await findByText('Promoted until 21.11 17:00')).toBeTruthy();
    expect(post).toHaveBeenCalledWith('/api/promotions', {});
    expect(Alert.alert).toHaveBeenCalledWith('Started');
  });

  it('pins in the chosen category, sending the canonical Russian name', async () => {
    post.mockResolvedValue({ status: { ...status, pin: { id: 'p', category: 'Уборка', startsAt: '', endsAt: '2026-11-21T12:00:00.000Z' } } });
    const { findByText, getByText } = setup();
    fireEvent.press(await findByText('Тозакунӣ'));
    fireEvent.press(getByText('Pin it'));

    expect(await findByText('Pinned in Тозакунӣ until 21.11 17:00')).toBeTruthy();
    expect(post).toHaveBeenCalledWith('/api/promotions', { category: 'Уборка' });
    expect(Alert.alert).toHaveBeenCalledWith('Pinned');
  });

  it('shows the server error and reloads the status', async () => {
    post.mockRejectedValue(new Error('No promotions left'));
    const { findByText } = setup();
    fireEvent.press(await findByText('Promote'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Error', 'No promotions left'));
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('does nothing when out of credits', async () => {
    get.mockResolvedValue({ ...status, remaining: 0 });
    const { findByText, getByText } = setup();
    fireEvent.press(await findByText('Promote'));
    fireEvent.press(getByText('Pin it'));
    expect(post).not.toHaveBeenCalled();
  });

  it('below BUSINESS: no pin section; BUSINESS without categories: a hint', async () => {
    get.mockResolvedValue({ ...status, canPin: false, pinSlots: [], periodEnd: null });
    const lower = setup();
    expect(await lower.findByText('Promote')).toBeTruthy();
    expect(lower.queryByText('Pin')).toBeNull();
    lower.unmount();

    get.mockResolvedValue({ ...status, pinSlots: [] });
    expect(await setup().findByText('Add categories')).toBeTruthy();
  });

  it('every slot full: nothing to choose, the pin button does nothing', async () => {
    get.mockResolvedValue({ ...status, pinSlots: [status.pinSlots[0]] });
    const { findByText, getByText } = setup();
    fireEvent.press(await findByText('Pin it'));
    expect(getByText('Таъмир: full until 20.11 23:00')).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });
});
