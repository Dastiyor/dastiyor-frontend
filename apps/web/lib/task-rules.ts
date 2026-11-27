/**
 * The rules a new task must meet, shared by the create form (checked as the
 * customer types) and `validateTaskInput` (checked by POST /api/tasks), so the
 * form never lets through what the server then rejects. The mobile app keeps a
 * copy of these numbers in apps/mobile/lib/task-rules.ts; edit both together.
 *
 * Plain data and string compares only: imported by a client component.
 */
export const TASK_TITLE_MIN = 5;
export const TASK_TITLE_MAX = 200;
/** The description is optional; only its length is capped. */
export const TASK_DESCRIPTION_MAX = 5000;
export const TASK_BUDGET_MAX = 10_000_000;

export type TaskField = 'title' | 'description' | 'category' | 'city' | 'amount';

/** Which rule a field breaks, as an i18n key under `createTask.` (web) / `t.createTask` (mobile). */
export type TaskFieldError =
    | 'errTitleShort' | 'errTitleLong' | 'errDescLong'
    | 'errCategory' | 'errCity' | 'errBudget' | 'errBudgetInvalid' | 'errBudgetTooHigh';

export function taskFieldErrors(data: {
    title?: string;
    description?: string;
    category?: string;
    city?: string;
    /** 'fixed' or 'negotiable'. A fixed price needs an amount above 0. */
    budget?: string;
    amount?: string | number;
}): Partial<Record<TaskField, TaskFieldError>> {
    const errors: Partial<Record<TaskField, TaskFieldError>> = {};
    const title = (data.title ?? '').trim();
    if (title.length < TASK_TITLE_MIN) errors.title = 'errTitleShort';
    else if (title.length > TASK_TITLE_MAX) errors.title = 'errTitleLong';

    if ((data.description ?? '').trim().length > TASK_DESCRIPTION_MAX) errors.description = 'errDescLong';
    if (!data.category) errors.category = 'errCategory';
    if (!data.city) errors.city = 'errCity';

    const amount = data.amount;
    const given = amount !== undefined && amount !== null && String(amount).trim() !== '';
    if (given) {
        const n = Number(amount);
        if (!Number.isFinite(n) || n < 0) errors.amount = 'errBudgetInvalid';
        else if (n > TASK_BUDGET_MAX) errors.amount = 'errBudgetTooHigh';
        else if (n === 0 && data.budget === 'fixed') errors.amount = 'errBudget';
    } else if (data.budget === 'fixed') {
        // "Фикс. цена" with no figure showed as "0 TJS"; "Договорная" is the way to leave it out.
        errors.amount = 'errBudget';
    }
    return errors;
}
