import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { LanguageProvider, useLanguage } from '../LanguageContext';

function TestConsumer() {
  const { locale, t } = useLanguage();
  return (
    <>
      <Text testID="locale">{locale}</Text>
      <Text testID="home-tab">{t.tabs.home}</Text>
    </>
  );
}

function SetLocaleConsumer({ next }: { next: 'ru' | 'tj' | 'en' }) {
  const { setLocale, locale } = useLanguage();
  React.useEffect(() => { setLocale(next); }, []);
  return <Text testID="locale">{locale}</Text>;
}

describe('LanguageContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  it('defaults to Russian locale', async () => {
    const { getByTestId } = render(
      <LanguageProvider><TestConsumer /></LanguageProvider>
    );
    await waitFor(() => {});
    expect(getByTestId('locale').props.children).toBe('ru');
  });

  it('loads saved locale from secure store on mount', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('en');

    const { getByTestId } = render(
      <LanguageProvider><TestConsumer /></LanguageProvider>
    );
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('en'));
  });

  it('ignores invalid locale from secure store', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('invalid');

    const { getByTestId } = render(
      <LanguageProvider><TestConsumer /></LanguageProvider>
    );
    await waitFor(() => {});
    expect(getByTestId('locale').props.children).toBe('ru');
  });

  it('updates locale and saves to secure store via setLocale', async () => {
    const { getByTestId } = render(
      <LanguageProvider><SetLocaleConsumer next="tj" /></LanguageProvider>
    );

    await waitFor(() => expect(getByTestId('locale').props.children).toBe('tj'));
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('app_locale', 'tj');
  });

  it('provides correct translations for current locale', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('en');

    const { getByTestId } = render(
      <LanguageProvider><TestConsumer /></LanguageProvider>
    );
    await waitFor(() => expect(getByTestId('locale').props.children).toBe('en'));
    expect(getByTestId('home-tab').props.children).toBe('Home');
  });

  it('throws when useLanguage used outside LanguageProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useLanguage must be used within LanguageProvider');
    spy.mockRestore();
  });
});
