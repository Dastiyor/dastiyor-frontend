import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { api } from '@/lib/api-client';
import { getTranslations } from '@/lib/i18n';
import { RecommendedProviders } from '../RecommendedProviders';

const get = api.get as jest.Mock;
const card = (id: string, fullName: string) => ({
  id, fullName, avatar: null, city: null, categories: [], experienceYears: null,
  isVerified: false, avgRating: 4.9, reviewCount: 2, completedCount: 1, tier: 'business' as const,
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider><ThemeProvider>{children}</ThemeProvider></LanguageProvider>
);
const ru = getTranslations('ru');

describe('RecommendedProviders', () => {
  beforeEach(() => get.mockReset());

  it('shows the heading and a directory card per provider', async () => {
    get.mockResolvedValueOnce({ providers: [card('p1', 'Ali Karimov'), card('p2', 'Bobo Saidov')] });
    const { findByText, getByText } = render(<RecommendedProviders taskId="t1" enabled refreshKey={0} />, { wrapper });

    expect(await findByText('Ali Karimov')).toBeTruthy();
    expect(getByText('Bobo Saidov')).toBeTruthy();
    expect(getByText(ru.recommended.title)).toBeTruthy();
    expect(get).toHaveBeenCalledWith('/api/tasks/t1/recommended-providers');
  });

  it('renders nothing when there is no one to recommend', async () => {
    get.mockResolvedValueOnce({ providers: [] });
    const { toJSON } = render(<RecommendedProviders taskId="t1" enabled />, { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(toJSON()).toBeNull();
  });

  it('renders nothing and calls nothing when disabled', () => {
    const { toJSON } = render(<RecommendedProviders taskId="t1" enabled={false} />, { wrapper });
    expect(toJSON()).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });
});
