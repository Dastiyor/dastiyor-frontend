import Purchases from 'react-native-purchases';

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { configure: jest.fn(), logIn: jest.fn(), logOut: jest.fn(), isAnonymous: jest.fn() },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: '1' },
}));

const P = Purchases as unknown as Record<string, jest.Mock>;
// A fresh module per test: the wrapper remembers whether it configured.
const load = () => {
  let mod!: typeof import('../purchases');
  jest.isolateModules(() => { mod = require('../purchases'); });
  return mod;
};

describe('purchases', () => {
  beforeEach(() => Object.values(P).forEach((fn) => fn.mockReset()));

  it('offers the store only when the native module is in the build', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NativeModules } = require('react-native');
    const saved = { native: NativeModules.RNPurchases, key: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY };
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_key';
    try {
      // Builds before 1.2.0 get this code by OTA without the native module
      delete NativeModules.RNPurchases;
      expect(load().storeKey()).toBeUndefined();
      NativeModules.RNPurchases = {};
      expect(load().storeKey()).toBe('appl_key');
    } finally {
      if (saved.native) NativeModules.RNPurchases = saved.native; else delete NativeModules.RNPurchases;
      if (saved.key) process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = saved.key; else delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
    }
  });

  it('does nothing without a store key', async () => {
    const { initPurchases, identifyPurchases } = load();
    expect(initPurchases(undefined)).toBe(false);
    await identifyPurchases('u1', undefined);
    expect(P.configure).not.toHaveBeenCalled();
    expect(P.logIn).not.toHaveBeenCalled();
  });

  it('configures once and logs in with our user id', async () => {
    const { initPurchases, identifyPurchases } = load();
    expect(initPurchases('appl_key')).toBe(true);
    expect(initPurchases('appl_key')).toBe(true);
    await identifyPurchases('user-1', 'appl_key');
    expect(P.configure).toHaveBeenCalledTimes(1);
    expect(P.configure).toHaveBeenCalledWith({ apiKey: 'appl_key' });
    expect(P.logIn).toHaveBeenCalledWith('user-1');
  });

  it('logout calls Purchases.logOut for an identified user', async () => {
    const { initPurchases, resetPurchases } = load();
    initPurchases('appl_key');
    P.isAnonymous.mockResolvedValue(false);
    await resetPurchases();
    expect(P.logOut).toHaveBeenCalled();
  });

  it('skips logOut for an anonymous user or when never configured', async () => {
    const first = load();
    await first.resetPurchases();
    expect(P.isAnonymous).not.toHaveBeenCalled();

    const second = load();
    second.initPurchases('appl_key');
    P.isAnonymous.mockResolvedValue(true);
    await second.resetPurchases();
    expect(P.logOut).not.toHaveBeenCalled();
  });

  it('swallows SDK errors so auth never breaks', async () => {
    const { initPurchases, identifyPurchases, resetPurchases } = load();
    initPurchases('appl_key');
    P.logIn.mockRejectedValue(new Error('network'));
    P.isAnonymous.mockRejectedValue(new Error('network'));
    await expect(identifyPurchases('u1', 'appl_key')).resolves.toBeUndefined();
    await expect(resetPurchases()).resolves.toBeUndefined();
  });

  it('recognises a user cancelling the purchase', () => {
    const { isUserCancel } = load();
    expect(isUserCancel({ userCancelled: true })).toBe(true);
    expect(isUserCancel({ code: '1' })).toBe(true);
    expect(isUserCancel(new Error('boom'))).toBe(false);
  });
});
