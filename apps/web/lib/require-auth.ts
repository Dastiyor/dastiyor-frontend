import { verifyJWTWithVersion, getBearerToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import type { JWTPayload } from 'jose';

/**
 * Extracts and fully verifies the JWT for an API route.
 * Checks both cryptographic signature AND tokenVersion against DB,
 * so revoked tokens (after logout / password change) are rejected.
 * Returns null if missing, invalid, expired, or version-mismatched.
 */
export async function requireAuth(request: Request): Promise<JWTPayload | null> {
    const bearer = getBearerToken(request);
    if (bearer) return verifyJWTWithVersion(bearer);

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;

    return verifyJWTWithVersion(token);
}
