import { taskFieldErrors, TASK_DESCRIPTION_MAX, TASK_TITLE_MAX } from '../task-rules';
import { validateTaskInput } from '../validation';

const ok = { title: 'Починить кран', category: 'Сантехника', city: 'Душанбе' };

describe('taskFieldErrors', () => {
    it('accepts a task with no description and no amount', () => {
        expect(taskFieldErrors(ok)).toEqual({});
        expect(taskFieldErrors({ ...ok, description: '', amount: '' })).toEqual({});
    });

    it('names each broken field', () => {
        expect(taskFieldErrors({})).toEqual({ title: 'errTitleShort', category: 'errCategory', city: 'errCity' });
        expect(taskFieldErrors({ ...ok, title: '  abcd  ' }).title).toBe('errTitleShort');
        expect(taskFieldErrors({ ...ok, title: 'x'.repeat(TASK_TITLE_MAX + 1) }).title).toBe('errTitleLong');
        expect(taskFieldErrors({ ...ok, description: 'x'.repeat(TASK_DESCRIPTION_MAX + 1) }).description).toBe('errDescLong');
    });

    it('needs an amount above 0 on a fixed price, none when negotiable', () => {
        expect(taskFieldErrors({ ...ok, budget: 'fixed' }).amount).toBe('errBudget');
        expect(taskFieldErrors({ ...ok, budget: 'fixed', amount: '' }).amount).toBe('errBudget');
        expect(taskFieldErrors({ ...ok, budget: 'fixed', amount: '0' }).amount).toBe('errBudget');
        expect(taskFieldErrors({ ...ok, budget: 'fixed', amount: '250' })).toEqual({});
        expect(taskFieldErrors({ ...ok, budget: 'negotiable', amount: '' })).toEqual({});
    });

    it('checks an amount only when one is given', () => {
        expect(taskFieldErrors({ ...ok, amount: 250 })).toEqual({});
        expect(taskFieldErrors({ ...ok, amount: '-5' }).amount).toBe('errBudgetInvalid');
        expect(taskFieldErrors({ ...ok, amount: 'abc' }).amount).toBe('errBudgetInvalid');
        expect(taskFieldErrors({ ...ok, amount: '10000001' }).amount).toBe('errBudgetTooHigh');
    });

    it('agrees with the server on what passes', () => {
        const cases: Array<typeof ok & { description?: string; budget?: string; amount?: string }> = [
            ok,
            { ...ok, budget: 'fixed' },
            { ...ok, budget: 'fixed', amount: '0' },
            { ...ok, budget: 'fixed', amount: '-5' },
            { ...ok, budget: 'fixed', amount: '300' },
            { ...ok, budget: 'negotiable' },
            { ...ok, description: 'коротко' },
            { ...ok, title: 'abc' },
            { ...ok, city: '' },
            { ...ok, description: 'x'.repeat(TASK_DESCRIPTION_MAX + 1) },
        ];
        for (const c of cases) {
            const formPasses = Object.keys(taskFieldErrors(c)).length === 0;
            const server = validateTaskInput({ ...c, budgetType: c.budget, budgetAmount: c.amount });
            expect(server.isValid).toBe(formPasses);
        }
    });
});

describe('validateTaskInput: optional description', () => {
    it('accepts a missing or short description', () => {
        expect(validateTaskInput(ok).isValid).toBe(true);
        expect(validateTaskInput({ ...ok, description: 'коротко' }).isValid).toBe(true);
    });

    it('still caps its length', () => {
        const res = validateTaskInput({ ...ok, description: 'x'.repeat(5001) });
        expect(res.errors).toEqual(['Описание не должно превышать 5000 символов']);
    });
});

describe('validateTaskInput: fixed price needs an amount', () => {
    it('rejects "Фикс. цена" with no amount or 0', () => {
        expect(validateTaskInput({ ...ok, budgetType: 'fixed' }).errors).toEqual(['Укажите сумму бюджета']);
        expect(validateTaskInput({ ...ok, budgetType: 'fixed', budgetAmount: '0' }).errors).toEqual(['Укажите сумму бюджета']);
    });

    it('accepts a fixed amount, a negotiable task, and legacy clients that send no type', () => {
        expect(validateTaskInput({ ...ok, budgetType: 'fixed', budgetAmount: '300' }).isValid).toBe(true);
        expect(validateTaskInput({ ...ok, budgetType: 'negotiable' }).isValid).toBe(true);
        expect(validateTaskInput({ ...ok, budgetAmount: '300' }).isValid).toBe(true);
    });
});
