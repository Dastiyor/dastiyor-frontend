import { getExpoPushToken, registerForPushNotifications, unregisterPushNotifications } from '@/lib/push';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: { post: jest.fn(), del: jest.fn() },
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
