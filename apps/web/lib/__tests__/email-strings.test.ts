import { emailStrings } from '../notifications/email-strings';

describe('email strings', () => {
  const KEYS = ['passwordReset','passwordResetCode','taskResponse','offerAccepted','taskCompleted',
                'offerRejected','newMessage','newReview','welcome','paymentReceipt','taskCancelled'] as const;

  it('covers every template in every language', () => {
    for (const locale of ['ru','tj','en']) {
      for (const key of KEYS) {
        const t = emailStrings(locale)[key];
        expect(typeof t.heading).toBe('string');
        expect(t.heading.length).toBeGreaterThan(0);
      }
    }
  });

  it('falls back to Russian for an unknown locale', () => {
    expect(emailStrings('fr').welcome.heading).toBe(emailStrings('ru').welcome.heading);
    expect(emailStrings(null).welcome.heading).toBe(emailStrings('ru').welcome.heading);
  });

  it('interpolates the task title in each language', () => {
    for (const locale of ['ru','tj','en']) {
      const t = emailStrings(locale).offerAccepted;
      expect(t.subject({ task: 'Fix the sink', link: '' })).toContain('Fix the sink');
      expect(t.body({ task: 'Fix the sink', link: '' }).join(' ')).toContain('Fix the sink');
    }
  });

  it('drops the earnings line when nothing was credited', () => {
    const en = emailStrings('en').taskCompleted;
    expect(en.body({ task: 'Job', link: '', earnings: '' }).join(' ')).not.toMatch(/balance/i);
    expect(en.body({ task: 'Job', link: '', earnings: '150' }).join(' ')).toMatch(/150 TJS/);
  });

  it('body lines are plain text, since the layout escapes them', () => {
    for (const locale of ['ru','tj','en']) {
      for (const key of KEYS) {
        const lines = emailStrings(locale)[key].body({
          task: 'T', provider: 'P', price: '1', link: 'L', code: '1', sender: 'S',
          excerpt: 'E', rating: '5', comment: 'C', name: 'N', amount: '1', plan: 'P', earnings: '1',
        });
        lines.forEach((l) => expect(l).not.toMatch(/<[a-z/]/i));
      }
    }
  });
});
