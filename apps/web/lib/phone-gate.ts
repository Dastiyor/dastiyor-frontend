/**
 * Verified-phone gate.
 *
 * Every user must verify a phone number by SMS before they can post a task or
 * respond to one. `phoneVerified` is set in exactly one place --
 * POST /api/auth/verify-phone, after a valid OTP -- so a number typed into the
 * profile form is deliberately not enough.
 *
 * Clients route to the verify flow on the PHONE_VERIFICATION_REQUIRED code:
 * /verify-phone on web, the verify-phone screen on mobile.
 */
export function needsPhoneVerification(user: { phoneVerified: boolean }): boolean {
    return !user.phoneVerified;
}

/** Machine-readable code returned to clients so they can route to the verify-phone flow. */
export const PHONE_VERIFICATION_REQUIRED = 'PHONE_VERIFICATION_REQUIRED';
