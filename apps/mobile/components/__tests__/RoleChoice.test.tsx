import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { getTranslations } from '@/lib/i18n';
import { RoleChoice } from '../RoleChoice';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: jest.requireActual('@/lib/i18n').getTranslations('ru'), locale: 'ru' }),
}));

const r = getTranslations('ru').register;
const setup = (busyRole: 'customer' | 'provider' | null = null) => {
  const onPick = jest.fn();
  const screen = render(<RoleChoice onPick={onPick} busyRole={busyRole} />, {
    wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
  });
  return { onPick, screen };
};

describe('RoleChoice', () => {
  it('shows both roles and the hint for people advertising services', () => {
    const { screen } = setup();
    expect(screen.getByText(r.customerTitle)).toBeTruthy();
    expect(screen.getByText(r.providerTitle)).toBeTruthy();
    expect(screen.getByText(r.advertiseHint)).toBeTruthy();
  });

  it('picks the role that was tapped', () => {
    const { onPick, screen } = setup();
    fireEvent.press(screen.getByTestId('role-provider'));
    expect(onPick).toHaveBeenCalledWith('provider');
    fireEvent.press(screen.getByTestId('role-customer'));
    expect(onPick).toHaveBeenCalledWith('customer');
  });

  it('takes no second pick while one is being submitted', () => {
    const { onPick, screen } = setup('customer');
    fireEvent.press(screen.getByTestId('role-provider'));
    expect(onPick).not.toHaveBeenCalled();
  });

  it('has the step text in every language', () => {
    for (const locale of ['en', 'ru', 'tj'] as const) {
      const reg = getTranslations(locale).register;
      for (const v of [reg.chooseTitle, reg.phoneVerified, reg.customerTitle, reg.providerTitle, reg.advertiseHint]) {
        expect(v).toBeTruthy();
      }
    }
  });
});
