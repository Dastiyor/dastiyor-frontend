/**
 * What an empty task feed offers, by who is looking:
 * - a customer: post the first task (in the category they were looking at);
 * - a provider on PRO and up: switch on new-task alerts;
 * - a FREE provider, who gets no alerts: the whole feed (when a category was
 *   narrowing it), and a plain line naming the plans that have alerts. No
 *   price, link or "buy" -- Google and Apple rules, see CLAUDE.md.
 * Providers are also told the app is for one-off tasks, not permanent jobs.
 * Same choices as EmptyFeedAction in apps/web/components/tasks/TasksFeed.tsx.
 */
export type EmptyFeedAction = 'createTask' | 'taskAlerts' | 'seeAllTasks' | null;

export interface EmptyFeedText {
  noTasksFilterHint: string;
  emptyCustomerDesc: string;
  emptyProviderDesc: string;
  alertsPaidOnly: string;
  oneOffHint: string;
}

export function emptyFeed(opts: {
  role: string | undefined;
  /** The provider's alert tier from /api/profile/task-alerts; null while unknown. */
  alertPlan: string | null;
  category: string;
  /** A search or a filter other than the category is narrowing the feed. */
  narrowed: boolean;
  text: EmptyFeedText;
}): { action: EmptyFeedAction; subtitle: string } {
  const { role, alertPlan, category, narrowed, text } = opts;
  const isProvider = role === 'PROVIDER';
  const hasAlerts = isProvider && alertPlan !== null && alertPlan !== 'free';
  const action: EmptyFeedAction = !isProvider
    ? 'createTask'
    : hasAlerts ? 'taskAlerts' : category ? 'seeAllTasks' : null;
  const subtitle = [
    narrowed ? text.noTasksFilterHint : null,
    !isProvider ? text.emptyCustomerDesc : hasAlerts ? text.emptyProviderDesc : text.alertsPaidOnly,
    isProvider ? text.oneOffHint : null,
  ].filter(Boolean).join('\n\n');
  return { action, subtitle };
}
