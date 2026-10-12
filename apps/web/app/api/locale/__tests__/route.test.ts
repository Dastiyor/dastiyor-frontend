import { GET } from '../route';

const req = (query: string, headers: Record<string, string> = {}) =>
    new Request(`http://localhost/api/locale${query}`, { headers: { host: 'www.dastiyor.com', ...headers } });

describe('GET /api/locale', () => {
    it('sets the locale cookie and returns to the referring page', () => {
        const res = GET(req('?set=tj', { referer: 'https://www.dastiyor.com/tasks?category=%D0%A3%D0%B1%D0%BE%D1%80%D0%BA%D0%B0' }));
        expect(res.status).toBe(303);
        expect(res.headers.get('location')).toBe('/tasks?category=%D0%A3%D0%B1%D0%BE%D1%80%D0%BA%D0%B0');
        expect(res.headers.get('set-cookie')).toBe('dastiyor_locale=tj; Path=/; Max-Age=31536000; SameSite=Lax');
    });

    it('accepts every supported locale', () => {
        expect(GET(req('?set=ru')).headers.get('set-cookie')).toContain('dastiyor_locale=ru');
    });

    it('ignores an unsupported locale but still redirects', () => {
        for (const query of ['?set=klingon', '?set=', '', '?set=tj%3B%20Domain%3Devil.com']) {
            const res = GET(req(query));
            expect(res.status).toBe(303);
            expect(res.headers.get('set-cookie')).toBeNull();
        }
    });

    it('goes home without a referer', () => {
        expect(GET(req('?set=tj')).headers.get('location')).toBe('/');
    });

    it('never redirects off the site', () => {
        const offsite = [
            'https://evil.example/phish',
            'https://www.dastiyor.com.evil.example/tasks',
            'https://www.dastiyor.com//evil.example/tasks',
            'not a url',
        ];
        for (const referer of offsite) {
            expect(GET(req('?set=tj', { referer })).headers.get('location')).toBe('/');
        }
    });
});
