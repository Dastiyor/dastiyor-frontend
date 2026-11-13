import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { getTranslations } from '@/lib/i18n';
import { PlanComparison } from '../PlanComparison';

const setup = (locale: 'ru' | 'tj' | 'en' = 'en') => render(
  <PlanComparison labels={getTranslations(locale).subscription.compare} current={null} />,
  { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> },
);

describe('PlanComparison', () => {
  it('compares the four plans with their real allowances and badges', () => {
    const screen = setup();
    expect(screen.getByText('Compare plans')).toBeTruthy();
    for (const head of ['FREE', 'PRO', 'BUSINESS']) expect(screen.getAllByText(head).length).toBeGreaterThan(0);
    // Promotions a month: 1 / 2 / 5, as lib/plans.ts gives them
    for (const n of ['1', '2', '5']) expect(screen.getByText(n)).toBeTruthy();
    expect(screen.getByText('TOP')).toBeTruthy();
    expect(screen.getByText('After 15 min')).toBeTruthy();
    expect(screen.getAllByText('Instant')).toHaveLength(2);
    expect(screen.getByText('How it works')).toBeTruthy();
  });

  it('offers nothing to press and names no price', () => {
    const screen = setup();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryByText(/\$|TJS|сомон/)).toBeNull();
  });

  it('has every label in Russian and Tajik', () => {
    for (const locale of ['ru', 'tj'] as const) {
      const c = getTranslations(locale).subscription.compare;
      for (const v of [...Object.values(c.rows), ...Object.values(c.values), c.title, c.howTitle, ...c.how]) expect(v).toBeTruthy();
      expect(setup(locale).getByText(c.title)).toBeTruthy();
    }
  });
});
