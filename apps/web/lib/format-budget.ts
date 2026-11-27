/**
 * Display string for a task's budget.
 *
 * A 'fixed' task with no amount used to render the literal "null TJS", which
 * clients show verbatim. Fall back to the negotiable label instead -- a fixed
 * price nobody set is, in practice, negotiable.
 *
 * The value stays a canonical Russian string: clients localize it for display
 * (see apps/mobile/lib/terms.ts and apps/web/lib/i18n/terms.ts) while the
 * stored and filtered value stays constant.
 */
export function formatBudget(budgetType: string | null, budgetAmount: string | null): string {
    return hasFixedAmount(budgetType, budgetAmount) ? `${formatMoney(budgetAmount)} TJS` : 'Договорная';
}

/**
 * True when a task really has a price: 'fixed' with an amount above 0. Tasks
 * posted as "Фикс. цена" with the amount left empty (or 0) -- possible on the
 * website until Nov 2026 -- are shown as negotiable everywhere, not "0 TJS".
 */
export function hasFixedAmount(budgetType: string | null, budgetAmount: string | number | null | undefined): boolean {
    if (budgetType !== 'fixed' || budgetAmount == null) return false;
    const n = Number(String(budgetAmount).trim());
    return String(budgetAmount).trim() !== '' && Number.isFinite(n) && n > 0;
}

/**
 * Group thousands with a non-breaking space -- the ru/tj convention, and the
 * reason 2500000 was printed as an unreadable run of digits.
 *
 * Deliberately not Intl.NumberFormat: the same helper is mirrored in the mobile
 * app, where Hermes' ICU support varies by platform, and the grouping rule here
 * is one regex. Non-numeric input is returned untouched.
 */
export function formatMoney(value: string | number | null | undefined): string {
    if (value == null || String(value).trim() === '') return '';
    const digits = String(value).trim();
    if (!/^\d+(\.\d+)?$/.test(digits)) return digits;
    const [whole, fraction] = digits.split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
    return fraction ? `${grouped}.${fraction}` : grouped;
}
