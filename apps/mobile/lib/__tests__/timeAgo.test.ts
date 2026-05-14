import { timeAgo } from '../timeAgo';

describe('timeAgo', () => {
  const RealDateNow = Date.now;

  // Pin "now" to 2026-05-14T12:00:00.000Z
  const NOW = new Date('2026-05-14T12:00:00.000Z').getTime();

  beforeAll(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('empty / invalid input', () => {
    it('returns empty string for empty input', () => {
      expect(timeAgo('')).toBe('');
    });

    it('returns original string for unparseable date', () => {
      expect(timeAgo('not-a-date')).toBe('not-a-date');
    });
  });

  describe('Russian locale (default)', () => {
    it('returns "только что" for < 1 minute ago', () => {
      const ts = new Date(NOW - 30_000).toISOString();
      expect(timeAgo(ts)).toBe('только что');
    });

    it('returns minutes ago for < 1 hour', () => {
      const ts = new Date(NOW - 5 * 60_000).toISOString();
      expect(timeAgo(ts)).toBe('5 мин. назад');
    });

    it('returns hours ago for < 24 hours', () => {
      const ts = new Date(NOW - 3 * 3_600_000).toISOString();
      expect(timeAgo(ts)).toBe('3 ч. назад');
    });

    it('returns "вчера" for exactly 1 day ago', () => {
      const ts = new Date(NOW - 1 * 86_400_000).toISOString();
      expect(timeAgo(ts)).toBe('вчера');
    });

    it('returns days ago for < 7 days', () => {
      const ts = new Date(NOW - 3 * 86_400_000).toISOString();
      expect(timeAgo(ts)).toBe('3 дн. назад');
    });

    it('returns weeks ago for < 5 weeks', () => {
      const ts = new Date(NOW - 14 * 86_400_000).toISOString();
      expect(timeAgo(ts)).toBe('2 нед. назад');
    });

    it('returns months ago for < 12 months', () => {
      const ts = new Date(NOW - 60 * 86_400_000).toISOString();
      expect(timeAgo(ts)).toBe('2 мес. назад');
    });

    it('returns years ago for >= 12 months', () => {
      const ts = new Date(NOW - 400 * 86_400_000).toISOString();
      expect(timeAgo(ts)).toBe('1 г. назад');
    });
  });

  describe('English locale', () => {
    it('returns "just now" for < 1 minute', () => {
      const ts = new Date(NOW - 10_000).toISOString();
      expect(timeAgo(ts, 'en')).toBe('just now');
    });

    it('returns "Xm ago" for minutes', () => {
      const ts = new Date(NOW - 10 * 60_000).toISOString();
      expect(timeAgo(ts, 'en')).toBe('10m ago');
    });

    it('returns "Xh ago" for hours', () => {
      const ts = new Date(NOW - 2 * 3_600_000).toISOString();
      expect(timeAgo(ts, 'en')).toBe('2h ago');
    });

    it('returns "yesterday" for 1 day ago', () => {
      const ts = new Date(NOW - 86_400_000).toISOString();
      expect(timeAgo(ts, 'en')).toBe('yesterday');
    });
  });

  describe('Tajik locale', () => {
    it('returns "ҳозир" for < 1 minute', () => {
      const ts = new Date(NOW - 30_000).toISOString();
      expect(timeAgo(ts, 'tj')).toBe('ҳозир');
    });

    it('returns minutes in Tajik', () => {
      const ts = new Date(NOW - 7 * 60_000).toISOString();
      expect(timeAgo(ts, 'tj')).toBe('7 дақ. пеш');
    });
  });

  describe('DD.MM.YYYY format (from API)', () => {
    it('parses DD.MM.YYYY date string correctly', () => {
      // 10 days before NOW date
      expect(timeAgo('04.05.2026', 'en')).toMatch(/\d+d ago|\d+w ago/);
    });

    it('returns correct result for a valid DD.MM.YYYY string', () => {
      // Far in the past
      const result = timeAgo('01.01.2024', 'en');
      expect(result).toMatch(/ago/);
    });
  });
});
