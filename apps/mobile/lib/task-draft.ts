/**
 * The unpublished task, kept on the phone: closing the form, an error, the app
 * being killed or a guest going off to sign in must not lose what was typed.
 *
 * SecureStore warns above 2048 bytes (a long description is bigger) but neither
 * platform enforces it in this SDK. ponytail: split across keys if a later SDK
 * starts throwing.
 */
import * as storage from '@/lib/storage';

export interface TaskDraft {
  title: string;
  description: string;
  category: string;
  city: string;
  budgetType: 'fixed' | 'negotiable';
  amount: string;
  urgency: string;
  address: string;
}

const KEY = 'task_draft';

export async function loadTaskDraft(): Promise<Partial<TaskDraft> | null> {
  try {
    const raw = await storage.getItem(KEY);
    const draft: unknown = raw ? JSON.parse(raw) : null;
    return draft && typeof draft === 'object' ? (draft as Partial<TaskDraft>) : null;
  } catch {
    return null;
  }
}

/** A form with nothing filled in removes the draft. */
export async function saveTaskDraft(draft: TaskDraft): Promise<void> {
  const filled = draft.title || draft.description || draft.category || draft.amount || draft.address;
  if (!filled) return clearTaskDraft();
  await storage.setItem(KEY, JSON.stringify(draft)).catch(() => {});
}

export async function clearTaskDraft(): Promise<void> {
  await storage.deleteItem(KEY).catch(() => {});
}
