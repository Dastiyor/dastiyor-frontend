import { getExpoPushToken, registerForPushNotifications, unregisterPushNotifications } from '@/lib/push';
import { api } from '@/lib/api-client';
import { Platform } from 'react-native';

jest.mock('@/lib/api-client', () => ({
  api: { post: jest.fn(), del: jest.fn() },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'test-project' } } } },
}));

describe('push (no physical device / no permission)', () => {
  afterEach(() => jest.clearAllMocks());

  it('getExpoPushToken returns null when not on a granted physical device', async () => {
    // Under Jest there is no physical device and no granted permission, so the
    // guarded flow resolves to null and registration degrades safely.
    await expect(getExpoPushToken()).resolves.toBeNull();
  });

  it('registerForPushNotifications returns null and does not call the API when no token', async () => {
    await expect(registerForPushNotifications()).resolves.toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('unregisterPushNotifications no-ops on a null token', async () => {
    await unregisterPushNotifications(null);
    expect(api.del).not.toHaveBeenCalled();
  });

  it('unregisterPushNotifications calls the API with the token', async () => {
    (api.del as jest.Mock).mockResolvedValue({});
    await unregisterPushNotifications('ExponentPushToken[x]');
    expect(api.del).toHaveBeenCalledWith('/api/push/register-device', {
      token: 'ExponentPushToken[x]',
    });
  });
});

describe('push (Android notification channel)', () => {
  const Notifications = jest.requireMock('expo-notifications');
  const Device = jest.requireMock('expo-device');
  const os = Platform.OS;

  beforeEach(() => {
    Device.isDevice = true;
    Notifications.AndroidImportance = { HIGH: 6 };
    Notifications.setNotificationChannelAsync = jest.fn().mockResolvedValue(null);
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
  });

  afterEach(() => {
    Platform.OS = os;
    Device.isDevice = false;
    delete Notifications.setNotificationChannelAsync;
    delete Notifications.AndroidImportance;
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    jest.clearAllMocks();
  });

  it('creates the channel before asking for permission', async () => {
    Platform.OS = 'android';
    await expect(getExpoPushToken()).resolves.toBe('ExponentPushToken[test]');
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', {
      name: 'Dastiyor',
      importance: 6,
    });
    expect(Notifications.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      Notifications.requestPermissionsAsync.mock.invocationCallOrder[0],
    );
  });

  it('still registers when the channel cannot be created', async () => {
    Platform.OS = 'android';
    Notifications.setNotificationChannelAsync.mockRejectedValue(new Error('nope'));
    await expect(getExpoPushToken()).resolves.toBe('ExponentPushToken[test]');
  });

  it('creates no channel on iOS', async () => {
    Platform.OS = 'ios';
    await getExpoPushToken();
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});
