import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ProfessionalCardItem } from '../ProfessionalCardItem';

const pro = {
  id: 'p1', fullName: 'Ali Karimov', avatar: null, city: 'Худжанд', categories: ['Ремонт'], experienceYears: 5,
  isVerified: true, avgRating: 4.5, reviewCount: 3, completedCount: 9, tier: 'premium' as const,
};
const labels = { reviews: 'reviews', completed: 'done', tiers: { basic: 'Basic', standard: 'Standard', premium: 'Premium' } };
const TJ: Record<string, string> = { 'Ремонт': 'Таъмир', 'Худжанд': 'Хуҷанд' };

const setup = (p = pro) => render(<ProfessionalCardItem pro={p} labels={labels} tr={(v) => TJ[v] ?? v} />, {
  wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
});

describe('ProfessionalCardItem', () => {
  beforeEach(() => (router.push as jest.Mock).mockClear());

  it('tap opens provider screen', () => {
    const { getByText } = setup();
    fireEvent.press(getByText('Ali Karimov'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/provider/[id]', params: { id: 'p1', name: 'Ali Karimov' } });
  });

  it('shows rating, counts, translated city and categories, tier', () => {
    const { getByText } = setup();
    expect(getByText('4.5')).toBeTruthy();
    expect(getByText('3 reviews · 9 done')).toBeTruthy();
    expect(getByText('Хуҷанд')).toBeTruthy();
    expect(getByText('Таъмир')).toBeTruthy();
    expect(getByText('Premium')).toBeTruthy();
  });

  it('shows a dash for an unrated provider', () => {
    const { getByText } = setup({ ...pro, avgRating: null, tier: null } as never);
    expect(getByText('—')).toBeTruthy();
  });
});
