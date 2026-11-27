import { formatBudget, formatMoney, hasFixedAmount } from '../format-budget';

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

  it('groups thousands so a large budget is readable', () => {
    expect(formatBudget('fixed', '2500000')).toBe('2\u00A0500\u00A0000 TJS');
  });
});

describe('formatMoney', () => {
  it('groups thousands with a non-breaking space', () => {
    expect(formatMoney('250')).toBe('250');
    expect(formatMoney(1000)).toBe('1\u00A0000');
    expect(formatMoney('2500000')).toBe('2\u00A0500\u00A0000');
    expect(formatMoney('1234.50')).toBe('1\u00A0234.50');
  });

  it('leaves non-numeric and empty input alone', () => {
    expect(formatMoney('Договорная')).toBe('Договорная');
    expect(formatMoney(null)).toBe('');
    expect(formatMoney('')).toBe('');
  });
});

describe('hasFixedAmount', () => {
    it('is true only for a fixed price above 0', () => {
        expect(hasFixedAmount('fixed', '250')).toBe(true);
        expect(hasFixedAmount('fixed', 250)).toBe(true);
        expect(hasFixedAmount('fixed', '0')).toBe(false);
        expect(hasFixedAmount('fixed', '')).toBe(false);
        expect(hasFixedAmount('fixed', null)).toBe(false);
        expect(hasFixedAmount('negotiable', '250')).toBe(false);
    });

    it('keeps old "Фикс. цена" tasks with 0 from showing as "0 TJS"', () => {
        expect(formatBudget('fixed', '0')).toBe('Договорная');
    });
});
