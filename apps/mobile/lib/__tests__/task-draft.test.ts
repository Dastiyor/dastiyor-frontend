import * as storage from '@/lib/storage';
import { clearTaskDraft, loadTaskDraft, saveTaskDraft, type TaskDraft } from '@/lib/task-draft';

jest.mock('@/lib/storage', () => {
  const m = new Map<string, string>();
  return {
    getItem: jest.fn(async (k: string) => m.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { m.set(k, v); }),
    deleteItem: jest.fn(async (k: string) => { m.delete(k); }),
  };
});

const empty: TaskDraft = { title: '', description: '', category: '', city: 'Душанбе', budgetType: 'negotiable', amount: '', urgency: 'normal', address: '' };

describe('task draft', () => {
  beforeEach(() => clearTaskDraft());

  it('round-trips', async () => {
    await saveTaskDraft({ ...empty, title: 'Кран' });
    expect(await loadTaskDraft()).toEqual({ ...empty, title: 'Кран' });
  });

  it('is removed once the form is emptied', async () => {
    await saveTaskDraft({ ...empty, title: 'Кран' });
    await saveTaskDraft(empty);
    expect(await loadTaskDraft()).toBeNull();
  });

  it('ignores a broken value', async () => {
    await storage.setItem('task_draft', '{oops');
    expect(await loadTaskDraft()).toBeNull();
  });
});
