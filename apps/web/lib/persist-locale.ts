import { prisma } from '@/lib/prisma';
import { asLocale } from '@/lib/notifications/strings';

/**
 * Carry the visitor's chosen language onto the account they just signed into,
 * and report the language to use from here on.
 *
 * The picker writes a `dastiyor_locale` cookie and only mirrors it to the
 * account when someone is already signed in -- but the language is usually
 * picked *before* logging in. Without this the account kept whatever locale it
 * was last left with, and every notification and email (both built from the
 * stored value, since another user's action triggers them) arrived in it.
 */
export async function persistRequestLocale(
    request: Request,
    userId: string,
    currentLocale: string,
): Promise<string> {
    const match = (request.headers.get('cookie') ?? '').match(/(?:^|;\s*)dastiyor_locale=([^;]+)/);
    if (!match) return currentLocale;

    let locale: string;
    try {
        locale = asLocale(decodeURIComponent(match[1]));
    } catch {
        return currentLocale; // malformed percent-encoding
    }
    if (locale === currentLocale) return currentLocale;

    await prisma.user.update({ where: { id: userId }, data: { locale } });
    return locale;
}
