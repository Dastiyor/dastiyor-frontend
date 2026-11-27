import fs from 'fs';
import path from 'path';
import { taskFieldErrors } from '../task-rules';

describe('task-rules (mobile copy)', () => {
  it('is the same code as the web file the server enforces', () => {
    const body = (file: string) => {
      const src = fs.readFileSync(file, 'utf8');
      return src.slice(src.indexOf('export const TASK_TITLE_MIN'))
        .replace(/\/\*\*[^]*?\*\//g, '') // doc comments may differ
        .replace(/\s+/g, ' ');
    };
    expect(body(path.join(__dirname, '../task-rules.ts')))
      .toBe(body(path.join(__dirname, '../../../web/lib/task-rules.ts')));
  });

  it('accepts a task with no description', () => {
    expect(taskFieldErrors({ title: 'Починить кран', category: 'Сантехника', city: 'Душанбе' })).toEqual({});
  });

  it('asks for an amount on a fixed price', () => {
    expect(taskFieldErrors({ title: 'Починить кран', category: 'Сантехника', city: 'Душанбе', budget: 'fixed' }).amount).toBe('errBudget');
  });
});
