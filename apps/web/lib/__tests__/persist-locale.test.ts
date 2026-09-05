import { prismaMock } from '../../__tests__/mocks/prisma';
import { persistRequestLocale } from '../persist-locale';

function req(cookie?: string) {
    return new Request('http://localhost/api/auth/login', {
        headers: cookie ? { cookie } : {},
    });
}

describe('persistRequestLocale', () => {
    beforeEach(() => jest.clearAllMocks());

    it('carries a language picked before signing in onto the account', async () => {
        const locale = await persistRequestLocale(req('dastiyor_locale=tj'), 'u1', 'ru');

        expect(locale).toBe('tj');
        expect(prismaMock.user.update).toHaveBeenCalledWith({
            where: { id: 'u1' },
            data: { locale: 'tj' },
        });
    });

    it('writes nothing when the account already matches', async () => {
        const locale = await persistRequestLocale(req('dastiyor_locale=tj'), 'u1', 'tj');

        expect(locale).toBe('tj');
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('keeps the stored language when the visitor has no preference cookie', async () => {
        // Signing in from a fresh browser must not reset a language the user
        // already chose on another device.
        const locale = await persistRequestLocale(req('token=abc'), 'u1', 'en');

        expect(locale).toBe('en');
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('finds the cookie among others and ignores junk values', async () => {
        await persistRequestLocale(req('token=abc; dastiyor_locale=en; theme=dark'), 'u1', 'ru');
        expect(prismaMock.user.update).toHaveBeenCalledWith({
            where: { id: 'u1' },
            data: { locale: 'en' },
        });

        jest.clearAllMocks();
        // An unsupported value falls back to 'ru' — which here is already stored.
        const locale = await persistRequestLocale(req('dastiyor_locale=fr'), 'u1', 'ru');
        expect(locale).toBe('ru');
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('survives a malformed cookie rather than breaking the sign-in', async () => {
        const locale = await persistRequestLocale(req('dastiyor_locale=%E0%A4%A'), 'u1', 'tj');

        expect(locale).toBe('tj');
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
});
