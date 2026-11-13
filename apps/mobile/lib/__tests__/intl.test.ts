import { formatDate, formatDushanbe, formatMoney, plural } from '../intl';

const SEPT_5 = '2026-09-05T10:00:00.000Z';

describe('formatDushanbe', () => {
    it('shows Dushanbe wall-clock time (UTC+5) whatever the phone zone', () => {
        expect(formatDushanbe('2026-11-20T18:00:00.000Z')).toBe('20.11 23:00');
        // 21:30 UTC on the 31st is already 1 January in Dushanbe
        expect(formatDushanbe('2026-12-31T21:30:00.000Z')).toBe('01.01 02:30');
    });

    it('is empty for a bad date', () => {
        expect(formatDushanbe('nope')).toBe('');
    });
});

describe('formatDate', () => {
    it('renders ru and tj as DD.MM.YYYY', () => {
        // "9/5/2026" reads as 9 May to this audience; Hermes' ICU data for
        // 'tg-TJ' in particular used to fall through to the en-US format.
        expect(formatDate(SEPT_5, 'ru')).toBe('05.09.2026');
        expect(formatDate(SEPT_5, 'tj')).toBe('05.09.2026');
    });

    it('leaves English on its own convention', () => {
        expect(formatDate(SEPT_5, 'en')).toMatch(/9.+5.+2026/);
    });

    it('still honours explicit options', () => {
        expect(formatDate(SEPT_5, 'ru', { day: 'numeric', month: 'long' })).not.toBe('05.09.2026');
    });

    it('returns empty for an unparseable date', () => {
        expect(formatDate('not-a-date', 'ru')).toBe('');
    });
});

describe('formatMoney', () => {
    it('groups thousands with a non-breaking space', () => {
        expect(formatMoney('250')).toBe('250');
        expect(formatMoney('2500000')).toBe('2 500 000');
    });

    it('leaves non-numeric and empty input alone', () => {
        expect(formatMoney('Договорная')).toBe('Договорная');
        expect(formatMoney(null)).toBe('');
    });
});

describe('plural', () => {
    const RU = ['отзыв', 'отзыва', 'отзывов'] as const;
    const EN = ['review', 'reviews', 'reviews'] as const;

    it('picks the three Russian forms', () => {
        expect(plural(1, 'ru', RU)).toBe('отзыв');
        expect(plural(2, 'ru', RU)).toBe('отзыва');
        expect(plural(5, 'ru', RU)).toBe('отзывов');
        expect(plural(11, 'ru', RU)).toBe('отзывов'); // the 11-14 exception
        expect(plural(21, 'ru', RU)).toBe('отзыв');
        expect(plural(0, 'ru', RU)).toBe('отзывов');
    });

    it('picks two forms for English', () => {
        expect(plural(1, 'en', EN)).toBe('review');
        expect(plural(2, 'en', EN)).toBe('reviews');
        expect(plural(0, 'en', EN)).toBe('reviews');
    });
});
