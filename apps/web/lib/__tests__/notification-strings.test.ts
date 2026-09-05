import {
  notificationStrings,
  asLocale,
  notificationParams,
  renderNotification,
} from '../notifications/strings';

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

describe('renderNotification', () => {
  it('rebuilds each type in the reader\'s current language', () => {
    const offer = notificationParams({ provider: 'Ali', price: '200', task: 'Fix sink' });
    expect(renderNotification('NEW_OFFER', offer, 'en')).toEqual({
      title: 'New offer',
      message: 'Ali offered 200 TJS for "Fix sink"',
    });
    expect(renderNotification('NEW_OFFER', offer, 'ru')?.title).toBe('Новое предложение');

    const task = notificationParams({ task: 'Fix sink' });
    expect(renderNotification('OFFER_ACCEPTED', task, 'en')?.title).toBe('Offer accepted!');
    expect(renderNotification('OFFER_REJECTED', task, 'en')?.title).toBe('Offer declined');

    const done = notificationParams({ task: 'Fix sink', credited: 150 });
    expect(renderNotification('TASK_COMPLETED', done, 'en')?.message).toMatch(/150 TJS/);
  });

  it('leaves a row alone when it cannot be rebuilt', () => {
    // Rows written before the params column, and anything malformed or of a
    // type with no template, must keep their stored text rather than blank out.
    expect(renderNotification('NEW_OFFER', null, 'en')).toBeNull();
    expect(renderNotification('NEW_OFFER', 'not json', 'en')).toBeNull();
    expect(renderNotification('SYSTEM', notificationParams({ task: 'x' }), 'en')).toBeNull();
    // Right type, but the ingredients it needs are missing.
    expect(renderNotification('NEW_OFFER', notificationParams({ task: 'x' }), 'en')).toBeNull();
  });
});
