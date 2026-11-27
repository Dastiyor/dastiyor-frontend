export type DevicePlatform = 'android' | 'ios' | 'desktop';

/**
 * Which store a visitor's device downloads from, read from the User-Agent.
 *
 * iPadOS 13+ Safari sends a Macintosh desktop UA by default, so an iPad lands on
 * 'desktop'; the download page keeps both stores reachable for that reason.
 */
export function detectPlatform(userAgent: string | null | undefined): DevicePlatform {
    const ua = userAgent ?? '';
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
    return 'desktop';
}
