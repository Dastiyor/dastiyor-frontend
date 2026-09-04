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
export function needsPhoneVerification(user: { phoneVerified: boolean }): boolean {
    if (!isPhoneVerificationEnabled()) return false;
    return !user.phoneVerified;
}

/** Machine-readable code returned to clients so they can route to the verify-phone flow. */
export const PHONE_VERIFICATION_REQUIRED = 'PHONE_VERIFICATION_REQUIRED';
