import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ProviderProfileSections } from '../ProviderProfileSections';

const TJ: Record<string, string> = { 'Ремонт': 'Таъмир', 'Худжанд': 'Хуҷанд' };
const labels = {
  verified: 'Verified', years: ['year', 'years', 'years'] as const, portfolio: 'Portfolio', ratingBreakdown: 'Ratings',
  tiers: { basic: 'Basic', standard: 'Standard', premium: 'Premium' },
};
const base = {
  experienceYears: 5, city: 'Худжанд', categories: ['Ремонт'], isVerified: true, tier: null,
  ratingBreakdown: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 3 }, reviewCount: 4,
  portfolio: [{ id: 'p', title: 'Kitchen', description: 'Tiles', images: ['https://x/a.jpg', 'https://x/b.jpg'], order: 0 }],
};

const setup = (overrides = {}) => render(
  <ProviderProfileSections profile={{ ...base, ...overrides }} labels={labels} tr={(v) => TJ[v] ?? v} locale="en" />,
  { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> },
);

describe('ProviderProfileSections', () => {
  it('shows translated city and categories, experience and verified mark', () => {
    const { getByText } = setup();
    expect(getByText('Хуҷанд')).toBeTruthy();
    expect(getByText('Таъмир')).toBeTruthy();
    expect(getByText('5 years')).toBeTruthy();
    expect(getByText('Verified')).toBeTruthy();
  });

  it('hides what is not set', () => {
    const { queryByText } = setup({ experienceYears: null, city: null, categories: [], isVerified: false });
    expect(queryByText(/years?$/)).toBeNull();
    expect(queryByText('Verified')).toBeNull();
  });

  it('shows tier badge only when tier is set', () => {
    expect(setup().queryByText('Premium')).toBeNull();
  });

  it('shows the tier label for a paid provider', () => {
    expect(setup({ tier: 'premium' }).getByText('Premium')).toBeTruthy();
  });

  it('hides portfolio section when empty', () => {
    expect(setup({ portfolio: [] }).queryByText('Portfolio')).toBeNull();
  });

  it('opens a portfolio photo full screen and closes it', () => {
    const { getByLabelText, queryByLabelText } = setup();
    fireEvent.press(getByLabelText('Kitchen 2'));
    expect(getByLabelText('Kitchen 2 full')).toBeTruthy();
    fireEvent.press(getByLabelText('Close'));
    expect(queryByLabelText('Kitchen 2 full')).toBeNull();
  });

  it('shows the rating breakdown with counts per star', () => {
    const { getByLabelText, queryByText } = setup();
    expect(getByLabelText('5★: 3')).toBeTruthy();
    expect(getByLabelText('1★: 0')).toBeTruthy();
    expect(queryByText('Ratings')).toBeTruthy();
  });

  it('hides the breakdown with no reviews', () => {
    expect(setup({ reviewCount: 0 }).queryByText('Ratings')).toBeNull();
  });
});
