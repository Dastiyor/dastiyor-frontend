import { notificationStrings, asLocale } from '../notifications/strings';

describe('notification strings', () => {
  it('falls back to Russian for unknown or missing locales', () => {
    // Existing rows default to 'ru'; anything unrecognised must not blank out.
    expect(asLocale(null)).toBe('ru');
    expect(asLocale('fr')).toBe('ru');
    expect(asLocale(undefined)).toBe('ru');
  });

  it('returns each supported language', () => {
    expect(notificationStrings('en').acceptedTitle).toBe('Offer accepted!');
    expect(notificationStrings('tj').acceptedTitle).toBe('Посух қабул шуд!');
    expect(notificationStrings('ru').acceptedTitle).toBe('Отклик принят!');
  });

  it('omits the balance line when nothing was credited', () => {
    expect(notificationStrings('en').completedBody('Job', 0)).not.toMatch(/balance/i);
    expect(notificationStrings('en').completedBody('Job', 150)).toMatch(/150 TJS/);
  });

  it('interpolates the task title in every language', () => {
    for (const l of ['ru', 'tj', 'en']) {
      expect(notificationStrings(l).rejectedBody('Fix the sink')).toContain('Fix the sink');
    }
  });
});
