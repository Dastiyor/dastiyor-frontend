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

/**
 * Verified-phone gate, off by default — every OTP costs money and the per-SMS
 * economics are unsettled.
 *
 * While off, nobody is asked to verify and posting/responding work as before.
 * The whole flow stays live and reachable behind it: /verify-phone on web, the
 * verify-phone screen on mobile, /api/auth/verify-send and /api/auth/verify-phone.
 * Don't delete any of it as dead code.
 *
 * Set PHONE_VERIFICATION_ENABLED=true to require a verified phone before posting
 * a task or responding to one. Read at call time rather than module load so the
 * value can be flipped per environment and asserted in tests.
 */
export function isPhoneVerificationEnabled(): boolean {
    return process.env.PHONE_VERIFICATION_ENABLED === 'true';
}
