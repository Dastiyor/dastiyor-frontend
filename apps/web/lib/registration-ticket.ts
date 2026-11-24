import { SignJWT, jwtVerify } from 'jose';
import { normalizePhone } from '@/lib/validation';

/**
 * Proof that a phone number passed its REGISTRATION code, handed out by
 * POST /api/auth/verify-check and accepted by POST /api/auth/register in place
 * of the code.
 *
 * It exists so the mobile signup can check the SMS code first and ask for the
 * role afterwards: the code is single-use, so checking it and then sending it
 * again to register would fail, and checking it twice would also spend two of
 * the three guesses the per-phone limit allows.
 *
 * Signed with a key derived from JWT_SECRET but not equal to it, so a ticket
 * can never pass verifyJWT as a session token, and a session token can never
 * pass as a ticket.
 */

export const REGISTRATION_TICKET_TTL_S = 30 * 60;
const AUDIENCE = 'dastiyor:registration';

function ticketKey(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set');
    return new TextEncoder().encode(`${secret}:registration-ticket`);
}

export async function issueRegistrationTicket(phone: string): Promise<string> {
    return new SignJWT({ phone: normalizePhone(phone) })
        .setProtectedHeader({ alg: 'HS256' })
        .setAudience(AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(`${REGISTRATION_TICKET_TTL_S}s`)
        .sign(ticketKey());
}

/** True when `ticket` is a valid, unexpired ticket for this phone number. */
export async function verifyRegistrationTicket(ticket: unknown, phone: string): Promise<boolean> {
    if (typeof ticket !== 'string' || !ticket) return false;
    try {
        const { payload } = await jwtVerify(ticket, ticketKey(), {
            algorithms: ['HS256'],
            audience: AUDIENCE,
        });
        return payload.phone === normalizePhone(phone);
    } catch {
        return false;
    }
}
