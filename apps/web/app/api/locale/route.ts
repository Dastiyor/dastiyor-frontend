import { LOCALES, type Locale } from '@/lib/i18n/types';

/**
 * Where the language switcher points as a plain link.
 *
 * Once the page has hydrated the switcher changes language in place and never
 * comes here. Until then — several seconds on a slow phone — it is only a link,
 * and this is what makes a tap in that window do something: set the same cookie
 * the client would, and send the visitor back to the page they were on.
 */
export function GET(request: Request) {
    const url = new URL(request.url);
    const requested = url.searchParams.get('set');

    const headers = new Headers({ Location: backTo(request), 'Cache-Control': 'no-store' });
    if (LOCALES.includes(requested as Locale)) {
        // Same attributes as setLocale() in lib/i18n/context.tsx.
        headers.append('Set-Cookie', `dastiyor_locale=${requested}; Path=/; Max-Age=31536000; SameSite=Lax`);
    }
    return new Response(null, { status: 303, headers });
}

/** The referring page when it is one of ours, as a relative URL; otherwise the home page. */
function backTo(request: Request): string {
    const referer = request.headers.get('referer');
    if (!referer) return '/';
    try {
        const from = new URL(referer);
        const back = from.pathname + from.search;
        // `//host` would be read as another site, so it is not a path of ours.
        if (from.host !== request.headers.get('host') || back.startsWith('//')) return '/';
        return back;
    } catch {
        return '/';
    }
}
