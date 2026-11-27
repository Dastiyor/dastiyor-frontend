/**
 * Analytics name of the current screen, from expo-router's segments. Dynamic
 * parts stay as their pattern ('task/[id]'), so no ids reach analytics.
 */
export function screenName(segments: readonly string[]): string {
  const path = segments.filter((s) => !s.startsWith('(')).join('/');
  if (path) return path;
  // A group's own index: the tab shell is Home, the onboarding is itself.
  const group = segments[0]?.replace(/[()]/g, '');
  if (!group) return 'splash';
  return group === 'tabs' ? 'home' : group;
}
