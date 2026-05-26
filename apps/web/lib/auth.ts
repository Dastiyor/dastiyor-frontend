import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
}
const key = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signJWT(payload: Record<string, unknown>) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(key);
}

export async function verifyJWT(token: string) {
    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch {
        return null;
    }
}

/**
 * Verify JWT AND check tokenVersion against DB to catch invalidated tokens
 * (after logout, password change, or password reset).
 * Returns null if token is expired, invalid, or version-mismatched.
 */
export async function verifyJWTWithVersion(token: string) {
    const payload = await verifyJWT(token);
    if (!payload?.id) return null;

    const userId = payload.id as string;
    const tokenVersion = (payload.tv as number | undefined) ?? 0;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tokenVersion: true },
    });

    if (!user || user.tokenVersion !== tokenVersion) return null;
    return payload;
}

export function getBearerToken(request: Request): string | null {
    const auth = request.headers.get('Authorization');
    return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}
