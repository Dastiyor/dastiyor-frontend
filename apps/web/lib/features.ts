/**
 * Central feature flags. Toggle via env vars — no code changes needed.
 *
 * Subscriptions / paid plans are hidden for now and will be re-enabled in ~1 month.
 * To bring everything back:
 *   1. Set NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED=true   (shows all subscription UI + entry points)
 *   2. Set SUBSCRIPTION_GATE_ENABLED=true           (re-enables the "active subscription required" gate on responses)
 *
 * Uses the NEXT_PUBLIC_ prefix so the same constant resolves in both Server and Client Components.
 */
export const SUBSCRIPTIONS_ENABLED =
    process.env.NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED === 'true';
