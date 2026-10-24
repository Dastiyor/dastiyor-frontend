import { formatPhone } from '../phone';

describe('formatPhone', () => {
  it('groups a Tajik number as +992 XXX XX XXXX', () => {
    expect(formatPhone('+992977777777')).toBe('+992 977 77 7777');
    expect(formatPhone('992973204040')).toBe('+992 973 20 4040');
  });

  it('accepts an already formatted number', () => {
    expect(formatPhone('+992 977 77 7777')).toBe('+992 977 77 7777');
  });

  it('leaves anything else untouched', () => {
    expect(formatPhone('+15551234567')).toBe('+15551234567');
    expect(formatPhone('')).toBe('');
  });
});
