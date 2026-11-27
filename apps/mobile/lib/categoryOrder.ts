/**
 * Categories with open tasks first, most tasks on top, ties (and empty ones)
 * in the admin's order. Without counts (older server, offline) the order is
 * left alone. Same order as sortByOpenTasks() in the web task sidebar.
 */
export function sortByOpenTasks(categories: readonly string[], counts: Record<string, number> | null): string[] {
  if (!counts) return [...categories];
  return categories
    .map((name, index) => ({ name, index, count: counts[name] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map((c) => c.name);
}
