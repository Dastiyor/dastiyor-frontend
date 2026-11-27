import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { api } from '@/lib/api-client';
import { Alert } from '@/lib/dialog';
import { getTranslations } from '@/lib/i18n';
import LoginScreen from '@/app/(auth)/login';

const mockLoginWithCode = jest.fn();
const mockLogin = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, Link: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/lib/nav', () => ({ goBack: jest.fn(), replaceFromModal: jest.fn() }));
jest.mock('@/lib/api-client', () => ({ api: { post: jest.fn() } }));
jest.mock('@/lib/dialog', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('@/lib/google-signin', () => ({ googleConfigured: false, signInWithGoogle: jest.fn() }));
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationButton: () => null, AppleAuthenticationButtonType: {}, AppleAuthenticationButtonStyle: {},
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(), notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {}, NotificationFeedbackType: {},
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/components/LanguageButton', () => ({ LanguageButton: () => null }));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, loginWithCode: mockLoginWithCode }),
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: jest.requireActual('@/lib/i18n').getTranslations('en') }),
}));

const t = getTranslations('en');
const L = t.login;
const mPost = api.post as jest.Mock;

const setup = () => render(<LoginScreen />, { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> });

describe('LoginScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('signs in with a phone number and an SMS code, no password', async () => {
    mPost.mockResolvedValue({});
    mockLoginWithCode.mockResolvedValue(undefined);
    const { getByLabelText, getByTestId, queryByText, getByText } = setup();
    expect(queryByText(L.passLabel)).toBeNull();

    fireEvent.changeText(getByLabelText(t.register.phone), '+992 90 123 4567');
    fireEvent.press(getByLabelText(L.getCode));
    await waitFor(() => expect(getByTestId('otp-input')).toBeTruthy());
    expect(mPost).toHaveBeenCalledWith('/api/auth/verify-send', { phone: '+992901234567', type: 'LOGIN' });
    // The resend button is counting down straight after the first code
    expect(getByText(t.resendCode.againIn.replace('{time}', '1:00'))).toBeTruthy();

    fireEvent.changeText(getByTestId('otp-input'), '123456');
    fireEvent.press(getByLabelText(L.btn));
    await waitFor(() => expect(mockLoginWithCode).toHaveBeenCalledWith('+992901234567', '123456'));
  });

  it('offers signup when the number has no account', async () => {
    mPost.mockRejectedValue(Object.assign(new Error('This number is not registered'), { code: 'ACCOUNT_NOT_FOUND' }));
    const { getByLabelText, queryByTestId } = setup();
    fireEvent.changeText(getByLabelText(t.register.phone), '901234567');
    fireEvent.press(getByLabelText(L.getCode));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(
      'This number is not registered', L.notFoundHint, expect.any(Array), { icon: 'error' },
    ));
    expect(queryByTestId('otp-input')).toBeNull();
  });

  it('moves to the SMS code when the account has no password', async () => {
    mockLogin.mockRejectedValue(Object.assign(new Error('no password'), { code: 'PASSWORD_NOT_SET' }));
    const { getByText, getByLabelText, getByPlaceholderText } = setup();
    fireEvent.press(getByText(L.byPassword));
    fireEvent.changeText(getByLabelText(L.emailLabel), '+992901234567');
    fireEvent.changeText(getByPlaceholderText(L.passPh), 'whatever1');
    fireEvent.press(getByLabelText(L.btn));
    await waitFor(() => expect(getByLabelText(t.register.phone).props.value).toBe('901234567'));
  });
});
