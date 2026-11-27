/**
 * Where to send someone after sign-in. The value comes from the address bar or
 * the OAuth `state`, so only a path on this site is accepted: anything else
 * returns ''. Backslashes and control characters are refused because browsers
 * read `/\host` as another site. The sign-in pages and API routes are refused
 * too, so a link cannot send people round in a circle.
 *
 * Plain string checks only: imported by client components and route handlers.
 */
export function safeRedirect(value: unknown): string {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '';
    if (value.includes('://') || /[\\\u0000-\u001f]/.test(value)) return '';
    if (/^\/(login|register|api)([/?#]|$)/.test(value)) return '';
    return value;
}

/** `href` carrying the target on, so it survives the hop between sign-in pages. */
export function withRedirect(href: string, redirect: string): string {
    if (!redirect) return href;
    return `${href}${href.includes('?') ? '&' : '?'}redirect=${encodeURIComponent(redirect)}`;
}
