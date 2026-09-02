import { formatBudget } from '../format-budget';

describe('formatBudget', () => {
  it('formats a fixed amount', () => {
    expect(formatBudget('fixed', '250')).toBe('250 TJS');
  });

  it('does not render "null TJS" when a fixed task has no amount', () => {
    // This reached task cards verbatim.
    expect(formatBudget('fixed', null)).toBe('Договорная');
    expect(formatBudget('fixed', '')).toBe('Договорная');
    expect(formatBudget('fixed', '   ')).toBe('Договорная');
  });

  it('labels negotiable budgets', () => {
    expect(formatBudget('negotiable', null)).toBe('Договорная');
    expect(formatBudget('negotiable', '250')).toBe('Договорная');
  });
});
