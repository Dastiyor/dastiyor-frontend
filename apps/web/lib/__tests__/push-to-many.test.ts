import { prismaMock } from '../../__tests__/mocks/prisma';
import webpush from 'web-push';

jest.mock('web-push', () => ({
    __esModule: true,
    default: { setVapidDetails: jest.fn(), sendNotification: jest.fn() },
}));

type Mod = typeof import('@/lib/web-push');

/** web-push.ts reads the VAPID keys at load, so load it with them set (or not). */
function load(withVapid: boolean): Mod {
    const saved = { pub: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv: process.env.VAPID_PRIVATE_KEY };
    if (withVapid) {
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'pub';
        process.env.VAPID_PRIVATE_KEY = 'priv';
    } else {
        delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        delete process.env.VAPID_PRIVATE_KEY;
    }
    let mod!: Mod;
    jest.isolateModules(() => { mod = require('@/lib/web-push'); });
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = saved.pub;
    process.env.VAPID_PRIVATE_KEY = saved.priv;
    if (saved.pub === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (saved.priv === undefined) delete process.env.VAPID_PRIVATE_KEY;
    return mod;
}

const msg = (userId: string, title = `hi ${userId}`) => ({ userId, payload: { title, body: 'b', url: '/tasks/t1' } });

describe('sendPushToMany', () => {
    const realFetch = global.fetch;

    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.pushSubscription.findMany.mockResolvedValue([]);
        prismaMock.deviceToken.findMany.mockResolvedValue([]);
        prismaMock.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });
        prismaMock.deviceToken.deleteMany.mockResolvedValue({ count: 0 });
    });

    afterEach(() => {
        global.fetch = realFetch;
        delete process.env.EXPO_ACCESS_TOKEN;
    });

    it('does nothing for an empty list', async () => {
        await load(true).sendPushToMany([]);
        expect(prismaMock.deviceToken.findMany).not.toHaveBeenCalled();
    });

    it('reads every recipient\'s devices in one query per channel', async () => {
        const fetchMock = jest.fn();
        global.fetch = fetchMock as unknown as typeof fetch;
        await load(true).sendPushToMany([msg('u1'), msg('u2'), msg('u1')]);

        expect(prismaMock.pushSubscription.findMany).toHaveBeenCalledTimes(1);
        expect(prismaMock.pushSubscription.findMany).toHaveBeenCalledWith({ where: { userId: { in: ['u1', 'u2'] } } });
        expect(prismaMock.deviceToken.findMany).toHaveBeenCalledWith({ where: { userId: { in: ['u1', 'u2'] } } });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('skips web push when VAPID is not configured', async () => {
        await load(false).sendPushToMany([msg('u1')]);
        expect(prismaMock.pushSubscription.findMany).not.toHaveBeenCalled();
    });

    it('sends each browser its own user\'s payload and prunes gone subscriptions', async () => {
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: 's1', userId: 'u1', endpoint: 'e1', p256dh: 'k', auth: 'a' },
            { id: 's2', userId: 'u2', endpoint: 'e2', p256dh: 'k', auth: 'a' },
            { id: 's3', userId: 'u2', endpoint: 'e3', p256dh: 'k', auth: 'a' },
        ] as never);
        (webpush.sendNotification as jest.Mock)
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce({ statusCode: 410 })
            .mockRejectedValueOnce({ statusCode: 500 });

        await load(true).sendPushToMany([msg('u1', 'one'), { userId: 'u2', payload: { title: 'two', body: 'b' } }]);

        const calls = (webpush.sendNotification as jest.Mock).mock.calls;
        expect(JSON.parse(calls[0][1])).toEqual({ title: 'one', body: 'b', icon: '/icon-192x192.png', data: { url: '/tasks/t1' } });
        expect(JSON.parse(calls[1][1])).toMatchObject({ title: 'two', data: { url: '/' } });
        expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['s2'] } } });
    });

    it('sends Expo messages in chunks of 100 and prunes unregistered tokens', async () => {
        process.env.EXPO_ACCESS_TOKEN = 'expo-token';
        const devices = Array.from({ length: 150 }, (_, i) => ({ id: `d${i}`, userId: i % 2 ? 'u1' : 'u2', token: `T${i}` }));
        prismaMock.deviceToken.findMany.mockResolvedValue(devices as never);
        const fetchMock = jest.fn()
            .mockResolvedValueOnce({ json: async () => ({ data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }] }) })
            .mockResolvedValueOnce({ json: async () => { throw new Error('bad json'); } });
        global.fetch = fetchMock as unknown as typeof fetch;

        await load(true).sendPushToMany([msg('u1', 'for u1'), msg('u2', 'for u2')]);

        expect(fetchMock).toHaveBeenCalledTimes(2);
        const [, first] = fetchMock.mock.calls[0];
        expect(first.headers.Authorization).toBe('Bearer expo-token');
        const sent = JSON.parse(first.body);
        expect(sent).toHaveLength(100);
        expect(sent[0]).toEqual({ to: 'T0', title: 'for u2', body: 'b', sound: 'default', data: { url: '/tasks/t1' } });
        expect(sent[1].title).toBe('for u1');
        expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toHaveLength(50);
        expect(prismaMock.deviceToken.deleteMany).toHaveBeenCalledWith({ where: { token: { in: ['T0'] } } });
    });

    it('keeps going when one Expo chunk fails to send', async () => {
        const devices = Array.from({ length: 101 }, (_, i) => ({ id: `d${i}`, userId: 'u1', token: `T${i}` }));
        prismaMock.deviceToken.findMany.mockResolvedValue(devices as never);
        const fetchMock = jest.fn()
            .mockRejectedValueOnce(new Error('network'))
            .mockResolvedValueOnce({ json: async () => ({ data: 'nope' }) });
        global.fetch = fetchMock as unknown as typeof fetch;

        await load(true).sendPushToMany([{ userId: 'u1', payload: { title: 't', body: 'b' } }]);

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(JSON.parse(fetchMock.mock.calls[1][1].body)[0].data).toEqual({ url: '/' });
        expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
        expect(prismaMock.deviceToken.deleteMany).not.toHaveBeenCalled();
    });
});
