import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { ProviderAnalytics } from '@dastiyor/types';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { getTranslations } from '@/lib/i18n';
import { ProviderAnalyticsView, dmy, formatMinutes, pct } from '../ProviderAnalyticsView';

const l = getTranslations('en').analytics;
const TJ: Record<string, string> = { 'Ремонт': 'Таъмир', 'Худжанд': 'Хуҷанд' };
const tr = (v: string) => TJ[v] ?? v;

const daily = Array.from({ length: 30 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, views: i % 4 }));
const FULL: ProviderAnalytics = {
  plan: 'business',
  viewsTrackedSince: '2026-11-13',
  profile: { views7: 9, views30: 41, daily, sources: { directory: 10, task: 5, search: 3, direct: 23 }, responses: 12, hired: 3, conversion: 25 },
  advanced: {
    you: { views30: 41, responses30: 4, conversion30: 25 },
    peers: { count: 7, views30: 11.5, responses30: 2, conversion30: null },
    byCategory: [{ name: 'Ремонт', views: 3 }],
    byCity: [{ name: 'Худжанд', views: 2 }],
  },
  responses: {
    sent: 12, viewed: null, hired: 3, conversion: 25,
    byCategory: [{ name: 'Ремонт', sent: 12, hired: 3, conversion: 25 }],
    avgResponseMinutes: 95,
    monthly: [{ month: '2026-10', sent: 5, hired: 1 }, { month: '2026-11', sent: 7, hired: 2 }],
  },
  locked: [],
};
const LOCKED: ProviderAnalytics = {
  plan: 'pro', viewsTrackedSince: '2026-11-13', profile: null, advanced: null, responses: null,
  locked: [{ section: 'profile', plan: 'pro_plus' }, { section: 'advanced', plan: 'business' }, { section: 'responses', plan: 'business' }],
};

const setup = (data: ProviderAnalytics, canBuy = false, onOpenPlans = jest.fn()) => render(
  <ProviderAnalyticsView data={data} labels={l} tr={tr} canBuy={canBuy} onOpenPlans={onOpenPlans} />,
  { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> },
);

describe('ProviderAnalyticsView', () => {
  it('explains when view counting started and shows the plan', () => {
    const { getByText } = setup(LOCKED);
    expect(getByText(/13\.11\.2026/)).toBeTruthy();
    expect(getByText(/Your plan: PRO ·/)).toBeTruthy();
  });

  it('locked sections name the plan and offer no purchase where the app cannot sell (Android)', () => {
    const { getByText, getAllByText, queryByText } = setup(LOCKED);
    expect(getByText('Available on the PRO+ plan')).toBeTruthy();
    expect(getAllByText('Available on the BUSINESS plan')).toHaveLength(2);
    expect(queryByText(l.lockedCta)).toBeNull();
  });

  it('offers the in-app plans where the store can sell', () => {
    const open = jest.fn();
    const { getAllByText } = setup(LOCKED, true, open);
    fireEvent.press(getAllByText(l.lockedCta)[0]);
    expect(open).toHaveBeenCalled();
  });

  it('BUSINESS shows every section with translated categories and cities', () => {
    const { getByText, getAllByText, getByTestId, queryByText } = setup(FULL);
    expect(getByText(l.profileTitle)).toBeTruthy();
    expect(getAllByText('41').length).toBeGreaterThan(0);
    expect(getByTestId('views-chart').children).toHaveLength(30);
    expect(getByText(l.sources.direct)).toBeTruthy();
    expect(getByText('Average of 7 providers in your categories')).toBeTruthy();
    expect(getByText('11.5')).toBeTruthy();
    expect(getAllByText('Таъмир').length).toBe(2);
    expect(getByText('Хуҷанд')).toBeTruthy();
    expect(getByText(l.viewedNotTracked)).toBeTruthy();
    expect(getByText('1 h 35 min')).toBeTruthy();
    expect(getByText('11.2026')).toBeTruthy();
    expect(queryByText(/Available on/)).toBeNull();
  });

  it('switches the chart to 7 days', () => {
    const { getByText, getByTestId } = setup(FULL);
    fireEvent.press(getByText(l.range7));
    expect(getByTestId('views-chart').children).toHaveLength(7);
    fireEvent.press(getByText(l.range30));
    expect(getByTestId('views-chart').children).toHaveLength(30);
  });

  it('handles no views, no peers and no responses', () => {
    const { getByText, getAllByText } = setup({
      ...FULL,
      profile: { ...FULL.profile!, daily: daily.map((d) => ({ ...d, views: 0 })), sources: { directory: 0, task: 0, search: 0, direct: 0 }, conversion: null },
      advanced: { ...FULL.advanced!, peers: null, byCategory: [], byCity: [] },
      responses: { ...FULL.responses!, sent: 0, byCategory: [], avgResponseMinutes: null, conversion: null },
    });
    expect(getByText(l.noPeers)).toBeTruthy();
    expect(getAllByText(l.breakdownEmpty)).toHaveLength(2);
    expect(getByText(l.responsesEmpty)).toBeTruthy();
  });
});

describe('formatting', () => {
  it('formats percentages, durations and dates', () => {
    expect(pct(null, l)).toBe('—');
    expect(pct(12.5, l)).toBe('12.5%');
    expect(formatMinutes(45, l)).toBe('45 min');
    expect(formatMinutes(1500, l)).toBe('1 d 1 h');
    expect(dmy('2026-11-13')).toBe('13.11.2026');
    expect(dmy('2026-11')).toBe('11.2026');
  });
});
