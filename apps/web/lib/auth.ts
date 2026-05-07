import { SignJWT, jwtVerify } from 'jose';

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

export function getBearerToken(request: Request): string | null {
    const auth = request.headers.get('Authorization');
    return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}
