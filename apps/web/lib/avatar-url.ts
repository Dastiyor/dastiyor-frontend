/**
 * Allow only https avatar URLs from storage we control.
 *
 * Without this, any https URL was accepted, so a user could point their avatar
 * at an arbitrary host -- every visitor to their profile would then request it,
 * handing that host their IP and a tracking signal. Mirrors the render-side
 * guard in apps/mobile/lib/avatar-url.ts; validate at the write boundary so
 * every client is covered, not just the ones that happen to check.
 */
export function isSafeAvatarUrl(url: string | null | undefined): boolean {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('https://')) return false;
    if (url.length > 2000) return false;

    try {
        const host = new URL(url).hostname.toLowerCase();

        if (host === 'dastiyor.com' || host.endsWith('.dastiyor.com')) return true;
        // Vercel Blob, where /api/upload writes.
        if (host.endsWith('.public.blob.vercel-storage.com')) return true;
        // Supabase Storage, kept for parity with the mobile allowlist.
        if (host === 'supabase.co' || host.endsWith('.supabase.co')) return true;
        if (host === 'supabase.in' || host.endsWith('.supabase.in')) return true;

        return false;
    } catch {
        return false;
    }
}
