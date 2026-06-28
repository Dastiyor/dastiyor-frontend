/**
 * Verified-phone gate for OAuth registrants.
 *
 * Users who registered via Google/Apple have no password and no phone number on file.
 * Before they can post or accept tasks they must add and verify a phone number
 * (via /verify-phone → POST /api/auth/verify-phone).
 *
 * Password-based accounts already provide a phone at registration and are unaffected.
 */
export function needsPhoneVerification(user: {
    password: string | null;
    googleId: string | null;
    appleId: string | null;
    phoneVerified: boolean;
}): boolean {
    const isOAuthOnly = !user.password && (Boolean(user.googleId) || Boolean(user.appleId));
    return isOAuthOnly && !user.phoneVerified;
}

/** Machine-readable code returned to clients so they can route to the verify-phone flow. */
export const PHONE_VERIFICATION_REQUIRED = 'PHONE_VERIFICATION_REQUIRED';
