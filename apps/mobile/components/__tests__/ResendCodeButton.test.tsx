import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { getTranslations } from '@/lib/i18n';
import { ResendCodeButton } from '../ResendCodeButton';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: jest.requireActual('@/lib/i18n').getTranslations('en') }),
}));

const rc = getTranslations('en').resendCode;
const setup = (props: React.ComponentProps<typeof ResendCodeButton>) =>
  render(<ResendCodeButton {...props} />, { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('ResendCodeButton', () => {
  it('counts down 60 seconds before it can be pressed', () => {
    const onResend = jest.fn(async () => true);
    const { getByRole } = setup({ onResend });
    expect(getByRole('button')).toHaveProp('accessibilityLabel', rc.againIn.replace('{time}', '1:00'));
    fireEvent.press(getByRole('button'));
    expect(onResend).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(55_000); });
    expect(getByRole('button')).toHaveProp('accessibilityLabel', rc.againIn.replace('{time}', '0:05'));
    act(() => { jest.advanceTimersByTime(5_000); });
    expect(getByRole('button')).toHaveProp('accessibilityLabel', rc.again);
  });

  it('sends once, then waits another 60 seconds', async () => {
    const onResend = jest.fn(async () => true);
    const { getByRole } = setup({ onResend });
    act(() => { jest.advanceTimersByTime(60_000); });
    await act(async () => { fireEvent.press(getByRole('button')); });
    expect(onResend).toHaveBeenCalledTimes(1);
    expect(getByRole('button')).toHaveProp('accessibilityLabel', rc.againIn.replace('{time}', '1:00'));
  });

  it('can be tried again at once when the send failed', async () => {
    const { getByRole } = setup({ onResend: jest.fn(async () => false) });
    act(() => { jest.advanceTimersByTime(60_000); });
    await act(async () => { fireEvent.press(getByRole('button')); });
    expect(getByRole('button')).toHaveProp('accessibilityLabel', rc.again);
  });
});
