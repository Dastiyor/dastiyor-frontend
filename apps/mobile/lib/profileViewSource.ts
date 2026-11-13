/**
 * Where a provider profile was opened from, carried through the route params
 * to GET /api/users/[id] so the provider's analytics can count the view by
 * source (see apps/web/lib/profile-views.ts). Optional: a profile opened
 * without it counts as a direct visit.
 */
export interface ProfileSource {
  src?: 'directory' | 'search' | 'task';
  taskId?: string;
  category?: string;
  city?: string;
}

const KEYS = ['src', 'taskId', 'category', 'city'] as const;

/** Only the keys that have a value: expo-router params must be strings. */
export function sourceParams(source: ProfileSource | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of KEYS) {
    const v = source?.[k];
    if (v) out[k] = v;
  }
  return out;
}

/** "?src=…" for the profile request, or '' when there is no source. */
export function profileQuery(params: Partial<Record<(typeof KEYS)[number], string | string[]>>): string {
  const q = new URLSearchParams();
  for (const k of KEYS) {
    const v = params[k];
    if (typeof v === 'string' && v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}
