/** Allow only https avatar URLs from trusted hosts or same API origin. */
export function isSafeAvatarUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('https://')) return false;
  if (url.length > 2000) return false;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const apiBase = process.env.EXPO_PUBLIC_API_URL ?? 'https://www.dastiyor.com';
    const apiHost = new URL(apiBase).hostname.toLowerCase();

    const allowed = new Set([
      apiHost,
      'dastiyor.com',
      'www.dastiyor.com',
      'supabase.co',
      'supabase.in',
    ]);

    if (allowed.has(host)) return true;
    if (host.endsWith('.supabase.co') || host.endsWith('.supabase.in')) return true;
    if (host.endsWith('.dastiyor.com')) return true;

    return false;
  } catch {
    return false;
  }
}
