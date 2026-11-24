/**
 * @jest-environment node
 */
// jest.setup.js mocks jose globally; these tests need real signatures.
jest.unmock('jose');

import { SignJWT } from 'jose';
import {
    issueRegistrationTicket,
    verifyRegistrationTicket,
    REGISTRATION_TICKET_TTL_S,
} from '../registration-ticket';

const PHONE = '+992900000001';

describe('registration ticket', () => {
    it('verifies for the phone it was issued to', async () => {
        const ticket = await issueRegistrationTicket(PHONE);
        expect(await verifyRegistrationTicket(ticket, PHONE)).toBe(true);
    });

    it('matches the phone however it is written', async () => {
        const ticket = await issueRegistrationTicket('992900000001');
        expect(await verifyRegistrationTicket(ticket, '+992 900 000 001')).toBe(true);
    });

    it('fails for another phone', async () => {
        const ticket = await issueRegistrationTicket(PHONE);
        expect(await verifyRegistrationTicket(ticket, '+992900000002')).toBe(false);
    });

    it('fails for a missing, non-string or garbage ticket', async () => {
        expect(await verifyRegistrationTicket(undefined, PHONE)).toBe(false);
        expect(await verifyRegistrationTicket('', PHONE)).toBe(false);
        expect(await verifyRegistrationTicket(123, PHONE)).toBe(false);
        expect(await verifyRegistrationTicket('a.b.c', PHONE)).toBe(false);
    });

    it('does not accept a session token signed with JWT_SECRET', async () => {
        const session = await new SignJWT({ phone: PHONE, id: 'u1' })
            .setProtectedHeader({ alg: 'HS256' })
            .setAudience('dastiyor:registration')
            .setExpirationTime('1h')
            .sign(new TextEncoder().encode(process.env.JWT_SECRET));
        expect(await verifyRegistrationTicket(session, PHONE)).toBe(false);
    });

    it('is not accepted as a session token', async () => {
        const { verifyJWT } = await import('../auth');
        const ticket = await issueRegistrationTicket(PHONE);
        expect(await verifyJWT(ticket)).toBeNull();
    });

    it('expires', async () => {
        jest.useFakeTimers({ now: Date.now() });
        try {
            const ticket = await issueRegistrationTicket(PHONE);
            jest.setSystemTime(Date.now() + (REGISTRATION_TICKET_TTL_S + 5) * 1000);
            expect(await verifyRegistrationTicket(ticket, PHONE)).toBe(false);
        } finally {
            jest.useRealTimers();
        }
    });

    it('cannot be issued without JWT_SECRET', async () => {
        const saved = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;
        try {
            await expect(issueRegistrationTicket(PHONE)).rejects.toThrow('JWT_SECRET');
        } finally {
            process.env.JWT_SECRET = saved;
        }
    });
});
