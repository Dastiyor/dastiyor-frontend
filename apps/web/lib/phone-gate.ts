import { isPhoneVerificationEnabled } from './features';

/**
 * Verified-phone gate, gated by PHONE_VERIFICATION_ENABLED (off by default —
 * see lib/features.ts, SMS costs money per message).
 *
 * When on, every user must verify a phone by SMS before posting a task or
 * responding to one. `phoneVerified` is set in exactly one place --
 * POST /api/auth/verify-phone, after a valid OTP -- so a number typed into the
 * profile form is deliberately not enough.
 *
 * Clients route to the verify flow on the PHONE_VERIFICATION_REQUIRED code:
 * /verify-phone on web, the verify-phone screen on mobile.
 */
export function needsPhoneVerification(user: GateUser): boolean {
    if (mustVerifyPhoneFirst(user)) return true;
    if (!isPhoneVerificationEnabled()) return false;
    return !user.phoneVerified;
}

type GateUser = { phoneVerified: boolean; googleId?: string | null; appleId?: string | null };

/**
 * Google/Apple accounts arrive with no phone at all, so they verify one before
 * anything else -- regardless of the flag above. Password signups already prove
 * their number in POST /api/auth/register and never hit this.
 *
 * This is the "stop and verify now" rule: the OAuth callbacks and both dashboard
 * layouts redirect to /verify-phone on it, and the mobile app is told through
 * `phoneVerificationRequired` on /api/auth/me and the OAuth mobile responses.
 */
export function mustVerifyPhoneFirst(user: GateUser): boolean {
    return !user.phoneVerified && Boolean(user.googleId || user.appleId);
}

/** Machine-readable code returned to clients so they can route to the verify-phone flow. */
export const PHONE_VERIFICATION_REQUIRED = 'PHONE_VERIFICATION_REQUIRED';
