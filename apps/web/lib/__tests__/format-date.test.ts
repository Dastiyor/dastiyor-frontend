import { formatTaskDate } from '../format-date';

describe('formatTaskDate', () => {
  it('renders an ISO timestamp as a date', () => {
    expect(formatTaskDate('2026-09-02T04:30:00.000Z')).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  it('passes legacy DD.MM.YYYY through unchanged', () => {
    // Cached responses from before the API sent ISO.
    expect(formatTaskDate('02.09.2026')).toBe('02.09.2026');
  });

  it('returns unparseable input rather than "Invalid Date"', () => {
    expect(formatTaskDate('not a date')).toBe('not a date');
    expect(formatTaskDate('')).toBe('');
  });
});
