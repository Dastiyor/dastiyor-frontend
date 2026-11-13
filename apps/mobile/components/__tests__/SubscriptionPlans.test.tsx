import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Purchases from 'react-native-purchases';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { api } from '@/lib/api-client';
import { Alert } from '@/lib/dialog';
import { SubscriptionPlans } from '../SubscriptionPlans';
import { getTranslations } from '@/lib/i18n';

jest.mock('@/lib/dialog', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('@/lib/legal', () => ({ openTermsOfService: jest.fn(), openPrivacyPolicy: jest.fn() }));

const P = Purchases as unknown as Record<string, jest.Mock>;
const get = api.get as jest.Mock;
const post = api.post as jest.Mock;

const pkg = (plan: string, price: string) => ({ identifier: `$rc_${plan}`, product: { identifier: `dastiyor_${plan}_monthly`, priceString: price } });
const offerings = { current: { availablePackages: [pkg('business', '$9.99'), pkg('pro', '$1.99'), pkg('pro_plus', '$4.99'), pkg('premium', '$5.99')] } };
const labels = {
  compare: getTranslations('en').subscription.compare,
  free: 'FREE', usage: 'Used {used} of {limit}', usageUnlimited: 'Used {used}, unlimited', rules: ['30 days'],
  buy: 'Subscribe', current: 'Current plan', until: 'Until', restore: 'Restore purchases', manage: 'Manage subscription',
  success: 'Subscribed', unavailable: 'Not available yet', terms: 'Terms', privacy: 'Privacy', error: 'Error', ok: 'OK',
};
const setup = () => render(<SubscriptionPlans labels={labels} storeReady />, { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> });

describe('SubscriptionPlans', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue({ subscription: null });
    P.getOfferings.mockResolvedValue(offerings);
    post.mockResolvedValue({ subscription: { plan: 'pro_plus', isCurrentlyActive: true, endDate: '2026-12-01T00:00:00Z', source: 'store' } });
  });

  it('renders store price strings in plan order, skipping products of old plans', async () => {
    const { findByText, getAllByText } = setup();
    expect(await findByText('$1.99')).toBeTruthy();
    expect(getAllByText(/^\$\d/).map((n) => n.props.children)).toEqual(['$1.99', '$4.99', '$9.99']);
    // Sorted PRO, PRO+, BUSINESS: dastiyor_pro_plus_monthly was read as PRO+, not PRO
    expect(getAllByText('BUSINESS').length).toBeGreaterThan(0);
  });

  it('shows FREE, this month\'s usage and the plan comparison when there is no plan', async () => {
    get.mockResolvedValue({ subscription: null, usage: { used: 3, limit: 5 } });
    const { findByText, getByText } = setup();
    expect(await findByText('Current plan: FREE')).toBeTruthy();
    expect(getByText('Used 3 of 5')).toBeTruthy();
    expect(getByText('Compare plans')).toBeTruthy();
    expect(getByText('How it works')).toBeTruthy();
  });

  it('purchase calls sync then shows success', async () => {
    P.purchasePackage.mockResolvedValue({});
    const { findAllByText } = setup();
    fireEvent.press((await findAllByText('Subscribe'))[1]);

    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/subscription/sync'));
    expect(P.purchasePackage).toHaveBeenCalledWith(offerings.current.availablePackages[2]);
    expect(Alert.alert).toHaveBeenCalledWith('Subscribed', 'PRO+');
  });

  it('user cancel shows no error', async () => {
    P.purchasePackage.mockRejectedValue({ userCancelled: true });
    const { findAllByText } = setup();
    fireEvent.press((await findAllByText('Subscribe'))[0]);

    await waitFor(() => expect(P.purchasePackage).toHaveBeenCalled());
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('a failed purchase shows the error', async () => {
    P.purchasePackage.mockRejectedValue(new Error('Payment declined'));
    const { findAllByText } = setup();
    fireEvent.press((await findAllByText('Subscribe'))[0]);
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Error', 'Payment declined'));
  });

  it('restore calls sync', async () => {
    P.restorePurchases.mockResolvedValue({});
    const { findByText } = setup();
    fireEvent.press(await findByText('Restore purchases'));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/subscription/sync'));
  });

  it('shows the current plan and Manage for a store subscription', async () => {
    get.mockResolvedValue({ subscription: { plan: 'business', isCurrentlyActive: true, endDate: '2026-12-01T00:00:00Z', source: 'store' }, usage: { used: 40, limit: null } });
    const { findByText, getByText } = setup();
    expect(await findByText('Current plan: BUSINESS')).toBeTruthy();
    expect(getByText('Used 40, unlimited')).toBeTruthy();
    fireEvent.press(await findByText('Manage subscription'));
    expect(P.showManageSubscriptions).toHaveBeenCalled();
  });

  it('says plans are not available when the store has no offering', async () => {
    P.getOfferings.mockResolvedValue({ current: null });
    const { findByText } = setup();
    expect(await findByText('Not available yet')).toBeTruthy();
  });

  describe('without a store (Android)', () => {
    const setupNoStore = () => render(<SubscriptionPlans labels={labels} storeReady={false} />, { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> });

    it('describes every plan with no price, buy button, payment rules or restore', async () => {
      const screen = setupNoStore();
      expect(await screen.findByText('Compare plans')).toBeTruthy();
      expect(screen.getByText('Pin in a category (24 h)')).toBeTruthy();
      expect(screen.getByText('How it works')).toBeTruthy();
      expect(screen.queryByText('Subscribe')).toBeNull();
      expect(screen.queryByText(/\$/)).toBeNull();
      expect(screen.queryByText('• 30 days')).toBeNull();
      expect(screen.queryByText('Restore purchases')).toBeNull();
      expect(screen.queryByText('Not available yet')).toBeNull();
      expect(P.getOfferings).not.toHaveBeenCalled();
    });

    it('shows a plan bought elsewhere as current, with no Manage link', async () => {
      get.mockResolvedValue({ subscription: { plan: 'pro_plus', isCurrentlyActive: true, endDate: '2026-12-13T00:00:00Z', source: 'web' } });
      const screen = setupNoStore();
      expect(await screen.findByText('Current plan: PRO+')).toBeTruthy();
      expect(screen.getByText(/^Until \d{2}\.12\.2026$/)).toBeTruthy();
      expect(screen.queryByText('Manage subscription')).toBeNull();
    });
  });
});
