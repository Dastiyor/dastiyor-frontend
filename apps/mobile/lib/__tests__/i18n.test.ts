import { getTranslations, LOCALE_NAMES } from '../i18n';

describe('i18n', () => {
  describe('LOCALE_NAMES', () => {
    it('has names for all 3 locales', () => {
      expect(LOCALE_NAMES.ru).toBe('Русский');
      expect(LOCALE_NAMES.tj).toBe('Тоҷикӣ');
      expect(LOCALE_NAMES.en).toBe('English');
    });
  });

  describe('getTranslations', () => {
    it('returns Russian translations for ru locale', () => {
      const t = getTranslations('ru');
      expect(t.tabs.home).toBeDefined();
      expect(typeof t.tabs.home).toBe('string');
    });

    it('returns Tajik translations for tj locale', () => {
      const t = getTranslations('tj');
      expect(t.tabs.home).toBeDefined();
    });

    it('returns English translations for en locale', () => {
      const t = getTranslations('en');
      expect(t.tabs.home).toBe('Home');
    });

    it('Russian and English tab names differ', () => {
      const ru = getTranslations('ru');
      const en = getTranslations('en');
      expect(ru.tabs.home).not.toBe(en.tabs.home);
    });

    it('all locales have same translation keys', () => {
      const ru = getTranslations('ru');
      const en = getTranslations('en');
      const tj = getTranslations('tj');

      // tabs
      expect(Object.keys(ru.tabs)).toEqual(Object.keys(en.tabs));
      expect(Object.keys(ru.tabs)).toEqual(Object.keys(tj.tabs));
    });

    it('status translations cover all task states', () => {
      const t = getTranslations('en');
      expect(t.status.OPEN).toBeDefined();
      expect(t.status.IN_PROGRESS).toBeDefined();
      expect(t.status.COMPLETED).toBeDefined();
      expect(t.status.CANCELLED).toBeDefined();
    });

    it('urgency translations cover all levels', () => {
      const t = getTranslations('en');
      expect(t.urgency.urgent).toBeDefined();
      expect(t.urgency.normal).toBeDefined();
      expect(t.urgency.low).toBeDefined();
    });

    it('returns an object with all expected top-level keys', () => {
      const t = getTranslations('ru');
      expect(t.tabs).toBeDefined();
      expect(t.status).toBeDefined();
      expect(t.urgency).toBeDefined();
      expect(t.home).toBeDefined();
    });
  });
});
