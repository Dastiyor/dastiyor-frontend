import React from 'react';
import { Linking, Modal, Share } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { getTranslations } from '@/lib/i18n';
import { openInAppBrowser, openPrivacyPolicy, openTermsOfService } from '@/lib/legal';
import { SideDrawer } from '../SideDrawer';

const t = getTranslations('en');
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: jest.requireActual('@/lib/i18n').getTranslations('en') }) }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', fullName: 'Тест Мастер', role: 'PROVIDER', avatar: null } }) }));
jest.mock('@/lib/useConfig', () => ({
  useConfig: () => ({ config: { company: { name: 'Dastiyor', email: 'info@x.tj', phone: '', supportEmail: 'help@x.tj', address: '' } } }),
}));
jest.mock('@/lib/legal', () => ({
  FAQ_URL: 'https://www.dastiyor.com/help',
  openInAppBrowser: jest.fn(async () => {}),
  openPrivacyPolicy: jest.fn(async () => {}),
  openTermsOfService: jest.fn(async () => {}),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const onClose = jest.fn();
const setup = () => render(<SideDrawer visible onClose={onClose} />, { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> });

// Tests run as iOS, where the drawer holds the item's action until its Modal reports onDismiss.
type Rendered = ReturnType<typeof setup>;
async function press(s: Rendered, label: string) {
  onClose.mockClear();
  fireEvent.press(s.getByText(label));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  s.UNSAFE_getByType(Modal).props.onDismiss();
}

describe('SideDrawer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists every menu entry', () => {
    const { getByText } = setup();
    for (const label of [t.menu.faq, t.menu.about, t.legal.privacy, t.legal.terms, t.menu.report, t.menu.contact, t.menu.share]) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it('closes, then runs the item: FAQ opens the help page in the in-app browser', async () => {
    await press(setup(), t.menu.faq);
    await waitFor(() => expect(openInAppBrowser).toHaveBeenCalledWith('https://www.dastiyor.com/help'));
  });

  it('does not open the browser until the drawer has been dismissed', async () => {
    const s = setup();
    fireEvent.press(s.getByText(t.legal.terms));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(openTermsOfService).not.toHaveBeenCalled();
    s.UNSAFE_getByType(Modal).props.onDismiss();
    s.UNSAFE_getByType(Modal).props.onDismiss(); // a second dismissal does not run it again
    expect(openTermsOfService).toHaveBeenCalledTimes(1);
  });

  it('routes About and Contact to their screens and opens the privacy policy', async () => {
    const s = setup();
    await press(s, t.menu.about);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/about'));
    await press(s, t.menu.contact);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/contact'));
    await press(s, t.legal.privacy);
    await waitFor(() => expect(openPrivacyPolicy).toHaveBeenCalled());
  });

  it('reports an issue by email to the admin-set support address', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await press(setup(), t.menu.report);
    await waitFor(() => expect(open).toHaveBeenCalledWith(expect.stringMatching(/^mailto:help@x\.tj\?subject=/)));
  });

  it('shares the app link', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await press(setup(), t.menu.share);
    await waitFor(() => expect(share).toHaveBeenCalledWith({ message: t.menu.shareMessage, url: 'https://www.dastiyor.com/mobile-app' }));
  });
});
