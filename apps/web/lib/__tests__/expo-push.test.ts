import { prismaMock } from '../../__tests__/mocks/prisma';
import { sendExpoPush } from '@/lib/web-push';

// web-push.ts imports the `web-push` package at module load; stub it so the
// Expo path can be tested in isolation.
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

describe('sendExpoPush', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.clearAllMocks();
  });

  it('no-ops when the user has no device tokens', async () => {
    (prismaMock.deviceToken.findMany as jest.Mock).mockResolvedValue([]);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendExpoPush('user-1', { title: 'Hi', body: 'There' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts one Expo message per device token', async () => {
    (prismaMock.deviceToken.findMany as jest.Mock).mockResolvedValue([
      { id: 'd1', token: 'ExponentPushToken[a]', userId: 'user-1' },
      { id: 'd2', token: 'ExponentPushToken[b]', userId: 'user-1' },
    ]);
    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({ data: [{ status: 'ok' }, { status: 'ok' }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendExpoPush('user-1', { title: 'New offer', body: 'Tap to view', url: '/tasks/1' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const sent = JSON.parse(init.body);
    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({ to: 'ExponentPushToken[a]', title: 'New offer' });
    expect(sent[0].data).toEqual({ url: '/tasks/1' });
  });

  it('prunes tokens Expo reports as DeviceNotRegistered', async () => {
    (prismaMock.deviceToken.findMany as jest.Mock).mockResolvedValue([
      { id: 'd1', token: 'ExponentPushToken[dead]', userId: 'user-1' },
    ]);
    (prismaMock.deviceToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }],
      }),
    }) as unknown as typeof fetch;

    await sendExpoPush('user-1', { title: 'x', body: 'y' });

    expect(prismaMock.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['ExponentPushToken[dead]'] } },
    });
  });

  it('swallows transport errors without throwing', async () => {
    (prismaMock.deviceToken.findMany as jest.Mock).mockResolvedValue([
      { id: 'd1', token: 'ExponentPushToken[a]', userId: 'user-1' },
    ]);
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    await expect(sendExpoPush('user-1', { title: 'x', body: 'y' })).resolves.toBeUndefined();
  });
});
