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
    if (budgetType === 'fixed' && budgetAmount != null && String(budgetAmount).trim() !== '') {
        return `${budgetAmount} TJS`;
    }
    return 'Договорная';
}
