/** @jest-environment node */
import { prismaMock } from '../../__tests__/mocks/prisma';
import {
    classifyAppParams,
    classifyReferer,
    dedupeKey,
    isBot,
    isPrefetch,
    recordProfileView,
    trackProfileApiView,
    trackProfilePageView,
} from '../profile-views';

// A token 'tok-<id>' verifies as user <id>; anything else is invalid.
jest.mock('../auth', () => ({
    ...jest.requireActual('../auth'),
    verifyJWT: jest.fn(async (t: string) => (t.startsWith('tok-') ? { id: t.slice(4) } : null)),
}));

const afterCallbacks: (() => Promise<void>)[] = [];
jest.mock('next/server', () => ({
    ...jest.requireActual('next/server'),
    after: jest.fn((cb: () => Promise<void>) => { afterCallbacks.push(cb); }),
}));

let mockHeaders = new Headers();
let mockCookie: string | undefined;
jest.mock('next/headers', () => ({
    headers: jest.fn(async () => mockHeaders),
    cookies: jest.fn(async () => ({ get: () => (mockCookie ? { value: mockCookie } : undefined) })),
}));

jest.mock('../categories', () => ({ getCategories: jest.fn(async () => ['Ремонт', 'Уборка']) }));

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const NOW = new Date('2026-11-13T10:00:00Z');

async function flushAfter() {
    while (afterCallbacks.length) await afterCallbacks.shift()!();
}

beforeEach(() => {
    afterCallbacks.length = 0;
    mockHeaders = new Headers();
    mockCookie = undefined;
    prismaMock.profileView.createMany.mockResolvedValue({ count: 1 });
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('isBot', () => {
    it('flags crawlers, previews, scripts and a missing user agent', () => {
        for (const ua of [null, '', 'Googlebot/2.1', 'facebookexternalhit/1.1', 'curl/8.0', 'python-requests/2.31', 'HeadlessChrome/120', 'TelegramBot (like TwitterBot)']) {
            expect(isBot(ua)).toBe(true);
        }
    });

    it('lets browsers and the app through', () => {
        for (const ua of [SAFARI, 'okhttp/4.12.0', 'Dastiyor/27 CFNetwork/1568.100.1 Darwin/24.0.0']) {
            expect(isBot(ua)).toBe(false);
        }
    });
});

describe('isPrefetch', () => {
    it('recognises router and browser prefetches', () => {
        expect(isPrefetch(new Headers({ 'next-router-prefetch': '1' }))).toBe(true);
        expect(isPrefetch(new Headers({ purpose: 'prefetch' }))).toBe(true);
        expect(isPrefetch(new Headers({ 'sec-purpose': 'prefetch;prerender' }))).toBe(true);
        expect(isPrefetch(new Headers())).toBe(false);
    });
});

describe('classifyReferer', () => {
    const host = 'www.dastiyor.com';
    it('is direct with no or a broken referrer, or from another site', () => {
        expect(classifyReferer(null, host)).toEqual({ source: 'DIRECT' });
        expect(classifyReferer('not a url', host)).toEqual({ source: 'DIRECT' });
        expect(classifyReferer('https://facebook.com/x', host)).toEqual({ source: 'DIRECT' });
        expect(classifyReferer('https://www.dastiyor.com/help', host)).toEqual({ source: 'DIRECT' });
    });

    it('counts search engines and the directory search as search', () => {
        expect(classifyReferer('https://www.google.com/', host).source).toBe('SEARCH');
        expect(classifyReferer('https://yandex.ru/search?text=x', host).source).toBe('SEARCH');
        expect(classifyReferer('https://www.dastiyor.com/professionals?q=plumber', host)).toEqual({ source: 'SEARCH', category: null, city: null });
    });

    it('keeps the directory filters', () => {
        const url = `https://dastiyor.com/professionals?category=${encodeURIComponent('Ремонт')}&city=${encodeURIComponent('Худжанд')}`;
        expect(classifyReferer(url, host)).toEqual({ source: 'DIRECTORY', category: 'Ремонт', city: 'Худжанд' });
        expect(classifyReferer('http://localhost:3000/professionals', 'localhost:3000').source).toBe('DIRECTORY');
    });

    it('reads the task id from any task page', () => {
        expect(classifyReferer('https://www.dastiyor.com/tasks/t1', host)).toEqual({ source: 'TASK', taskId: 't1' });
        expect(classifyReferer('https://www.dastiyor.com/customer/tasks/t2?x=1', host)).toEqual({ source: 'TASK', taskId: 't2' });
        expect(classifyReferer('https://www.dastiyor.com/provider/tasks/t3', host)).toEqual({ source: 'TASK', taskId: 't3' });
    });
});

describe('classifyAppParams', () => {
    it('maps the src parameter and defaults to direct for old builds', () => {
        expect(classifyAppParams(new URLSearchParams())).toEqual({ source: 'DIRECT', taskId: null, category: null, city: null });
        expect(classifyAppParams(new URLSearchParams('src=bogus')).source).toBe('DIRECT');
        expect(classifyAppParams(new URLSearchParams('src=task&taskId=t1'))).toEqual({ source: 'TASK', taskId: 't1', category: null, city: null });
        expect(classifyAppParams(new URLSearchParams('src=directory&category=Ремонт&city=Бохтар&taskId=t1')))
            .toEqual({ source: 'DIRECTORY', taskId: null, category: 'Ремонт', city: 'Бохтар' });
        expect(classifyAppParams(new URLSearchParams('src=search')).source).toBe('SEARCH');
    });
});

describe('dedupeKey', () => {
    it('is stable within a window and changes across windows, viewers and providers', () => {
        const k = dedupeKey('p1', 'u:a', NOW);
        expect(k).toMatch(/^[0-9a-f]{64}$/);
        expect(dedupeKey('p1', 'u:a', new Date('2026-11-13T11:59:00Z'))).toBe(k);
        expect(dedupeKey('p1', 'u:a', new Date('2026-11-13T12:00:00Z'))).not.toBe(k);
        expect(dedupeKey('p1', 'u:b', NOW)).not.toBe(k);
        expect(dedupeKey('p2', 'u:a', NOW)).not.toBe(k);
    });

    it('does not contain the visitor in the clear', () => {
        expect(dedupeKey('p1', 'a:95.142.10.7|Safari', NOW)).not.toContain('95.142');
    });
});

describe('recordProfileView', () => {
    const base = { providerId: 'p1', viewerId: null, visitor: '1.2.3.4|ua', platform: 'WEB' as const, now: NOW };

    it('skips the provider looking at their own profile', async () => {
        expect(await recordProfileView({ ...base, viewerId: 'p1', source: 'DIRECT' })).toBe(false);
        expect(prismaMock.profileView.createMany).not.toHaveBeenCalled();
    });

    it('inserts once per window, skipping duplicates', async () => {
        expect(await recordProfileView({ ...base, viewerId: 'u1', source: 'DIRECT' })).toBe(true);
        expect(prismaMock.profileView.createMany).toHaveBeenCalledWith({
            data: [expect.objectContaining({
                providerId: 'p1', viewerId: 'u1', source: 'DIRECT', platform: 'WEB', category: null, city: null,
                dedupeKey: dedupeKey('p1', 'u:u1', NOW), createdAt: NOW,
            })],
            skipDuplicates: true,
        });
        prismaMock.profileView.createMany.mockResolvedValue({ count: 0 });
        expect(await recordProfileView({ ...base, viewerId: 'u1', source: 'DIRECT' })).toBe(false);
    });

    it('keys anonymous visitors by their hashed fingerprint and keeps no ip', async () => {
        await recordProfileView({ ...base, source: 'DIRECT' });
        const row = (prismaMock.profileView.createMany.mock.calls[0][0] as { data: Record<string, unknown>[] }).data[0];
        expect(row.dedupeKey).toBe(dedupeKey('p1', 'a:1.2.3.4|ua', NOW));
        expect(JSON.stringify(row)).not.toContain('1.2.3.4');
    });

    it('takes category and city from the task', async () => {
        prismaMock.task.findUnique.mockResolvedValue({ category: 'Уборка', city: 'Душанбе' } as never);
        await recordProfileView({ ...base, source: 'TASK', taskId: 't1' });
        expect(prismaMock.profileView.createMany).toHaveBeenCalledWith(expect.objectContaining({
            data: [expect.objectContaining({ source: 'TASK', category: 'Уборка', city: 'Душанбе' })],
        }));
    });

    it('keeps no context for an unknown task', async () => {
        prismaMock.task.findUnique.mockResolvedValue(null);
        await recordProfileView({ ...base, source: 'TASK', taskId: 'nope' });
        expect(prismaMock.profileView.createMany).toHaveBeenCalledWith(expect.objectContaining({
            data: [expect.objectContaining({ category: null, city: null })],
        }));
    });

    it('drops categories and cities that are not canonical', async () => {
        await recordProfileView({ ...base, source: 'DIRECTORY', category: 'Ремонт', city: 'Бохтар' });
        await recordProfileView({ ...base, source: 'DIRECTORY', category: '<script>', city: 'Москва' });
        const rows = prismaMock.profileView.createMany.mock.calls.map(c => (c[0] as { data: Record<string, unknown>[] }).data[0]);
        expect(rows[0]).toMatchObject({ category: 'Ремонт', city: 'Бохтар' });
        expect(rows[1]).toMatchObject({ category: null, city: null });
    });

    it('never throws', async () => {
        prismaMock.profileView.createMany.mockRejectedValue(new Error('db down'));
        expect(await recordProfileView({ ...base, source: 'DIRECT' })).toBe(false);
    });

    it('uses the current time by default', async () => {
        await recordProfileView({ providerId: 'p1', viewerId: null, visitor: 'v', platform: 'APP', source: 'DIRECT' });
        const row = (prismaMock.profileView.createMany.mock.calls[0][0] as { data: { createdAt: Date }[] }).data[0];
        expect(Date.now() - row.createdAt.getTime()).toBeLessThan(5000);
    });
});

describe('trackProfilePageView', () => {
    it('records after the response with the signed-in viewer and the referrer', async () => {
        mockCookie = 'tok-u1';
        mockHeaders = new Headers({ 'user-agent': SAFARI, host: 'www.dastiyor.com', referer: 'https://www.dastiyor.com/professionals' });
        await trackProfilePageView('p1');
        expect(prismaMock.profileView.createMany).not.toHaveBeenCalled();
        await flushAfter();
        expect(prismaMock.profileView.createMany).toHaveBeenCalledWith(expect.objectContaining({
            data: [expect.objectContaining({ providerId: 'p1', viewerId: 'u1', source: 'DIRECTORY', platform: 'WEB' })],
        }));
    });

    it('treats a bad cookie as anonymous', async () => {
        mockCookie = 'garbage';
        mockHeaders = new Headers({ 'user-agent': SAFARI });
        await trackProfilePageView('p1');
        await flushAfter();
        expect(prismaMock.profileView.createMany).toHaveBeenCalledWith(expect.objectContaining({
            data: [expect.objectContaining({ viewerId: null, source: 'DIRECT' })],
        }));
    });

    it('ignores bots and prefetches', async () => {
        mockHeaders = new Headers({ 'user-agent': 'Googlebot/2.1' });
        await trackProfilePageView('p1');
        mockHeaders = new Headers({ 'user-agent': SAFARI, 'next-router-prefetch': '1' });
        await trackProfilePageView('p1');
        expect(afterCallbacks).toHaveLength(0);
    });

    it('never throws when the request cannot be read', async () => {
        const { headers } = jest.requireMock('next/headers');
        headers.mockRejectedValueOnce(new Error('outside a request'));
        await expect(trackProfilePageView('p1')).resolves.toBeUndefined();
    });
});

describe('trackProfileApiView', () => {
    const req = (query: string, headers: Record<string, string>) => new Request(`http://localhost/api/users/p1${query}`, { headers });

    it('records an app view with the bearer viewer and the src parameter', async () => {
        const token = 'tok-u2';
        trackProfileApiView(req('?src=search', { 'user-agent': 'okhttp/4.12.0', authorization: `Bearer ${token}` }), 'p1');
        await flushAfter();
        expect(prismaMock.profileView.createMany).toHaveBeenCalledWith(expect.objectContaining({
            data: [expect.objectContaining({ viewerId: 'u2', source: 'SEARCH', platform: 'APP' })],
        }));
    });

    it('records anonymous views and skips bots', async () => {
        trackProfileApiView(req('', { 'user-agent': 'curl/8' }), 'p1');
        expect(afterCallbacks).toHaveLength(0);
        trackProfileApiView(req('', { 'user-agent': 'okhttp/4.12.0' }), 'p1');
        await flushAfter();
        expect(prismaMock.profileView.createMany).toHaveBeenCalledWith(expect.objectContaining({
            data: [expect.objectContaining({ viewerId: null, source: 'DIRECT' })],
        }));
    });

    it('never throws', () => {
        expect(() => trackProfileApiView({ headers: new Headers({ 'user-agent': 'okhttp' }), url: 'bad' } as unknown as Request, 'p1')).not.toThrow();
    });
});
