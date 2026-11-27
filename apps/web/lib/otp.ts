import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode } from '@/lib/notifications/sms';
import { normalizePhone } from '@/lib/validation';
import { logAction } from '@/lib/audit';

/**
 * Phone OTP issue/consume, shared by phone verification (`verify-send` /
 * `verify-check`) and by password reset (`forgot-password` / `reset-password`).
 *
 * Both flows must behave identically — same expiry, same single-use rule, same
 * designated-test-number override — so they live here rather than being copied
 * into each route.
 */

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * How many unexpired codes a number may hold at once. A text can arrive after
 * the person has asked for another, so earlier codes keep working; guesses are
 * capped per number by the routes, so a few live codes cost little.
 */
export const OTP_MAX_LIVE = 3;

/** Schema comment on VerificationCode.type is the source of truth for these. */
export type OtpType = 'REGISTRATION' | 'RESET_PASSWORD' | 'LOGIN' | string;

/**
 * One designated number gets a fixed code and no SMS. App Store and Play
 * reviewers cannot receive a Tajik SMS, so store review needs this either way;
 * it also unblocks QA while SMS credits are pending.
 *
 * This does NOT weaken verification: the check side still requires the stored
 * code, unexpired and unused. All this changes is where the code comes from and
 * that no SMS is sent, for one number. Inert unless BOTH env vars are set.
 * Point SMS_TEST_PHONE at a number the team controls, never a real user's, and
 * unset both once SMS delivery is proven.
 */
export function isDesignatedTestPhone(normalizedPhone: string): boolean {
    const testPhone = process.env.SMS_TEST_PHONE;
    const testCode = process.env.SMS_TEST_CODE;
    return (
        Boolean(testPhone) && Boolean(testCode) &&
        normalizedPhone === normalizePhone(testPhone as string)
    );
}

/**
 * Store a fresh code for this phone/type and text it to the user. Earlier codes
 * stay usable until they expire (the newest OTP_MAX_LIVE of them). Returns false
 * only when the SMS provider rejects the send — the code is stored either way,
 * so a designated test number (or a run with SMS credits exhausted) still has a
 * usable code server-side.
 */
export async function issueOtp(phone: string, type: OtpType): Promise<boolean> {
    const normalizedPhone = normalizePhone(phone);
    const isTestPhone = isDesignatedTestPhone(normalizedPhone);
    const code = isTestPhone
        ? (process.env.SMS_TEST_CODE as string)
        : crypto.randomInt(100000, 999999).toString();

    await prisma.verificationCode.deleteMany({
        where: { phone: normalizedPhone, type, expiresAt: { lte: new Date() } },
    });
    await prisma.verificationCode.create({
        data: { phone: normalizedPhone, code, type, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    const surplus = await prisma.verificationCode.findMany({
        where: { phone: normalizedPhone, type },
        orderBy: { createdAt: 'desc' },
        skip: OTP_MAX_LIVE,
        select: { id: true },
    });
    if (surplus.length) {
        await prisma.verificationCode.deleteMany({ where: { id: { in: surplus.map((row) => row.id) } } });
    }

    if (isTestPhone) return true;
    return sendVerificationCode(normalizedPhone, code);
}

/**
 * Why a code was refused, for the audit log and the server log. The person is
 * told the same thing in every case. Never records the code or the full number.
 */
async function recordRejection(phone: string, code: string, type: OtpType): Promise<void> {
    try {
        const rows = await prisma.verificationCode.findMany({
            where: { phone, type },
            select: { code: true, expiresAt: true },
        });
        const now = new Date();
        const reason = rows.some((row) => row.code === code && row.expiresAt <= now)
            ? 'expired' // the right code, too late: a slow SMS
            : rows.some((row) => row.expiresAt > now)
                ? 'wrong_code'
                : 'no_code'; // never sent, already used, or replaced
        const details = { type, reason, phone: `***${phone.slice(-4)}` };
        console.warn('[otp] code rejected', JSON.stringify(details));
        logAction({ action: 'OTP_REJECTED', entity: 'VerificationCode', details });
    } catch (error) {
        console.error('[otp] could not record a rejection:', error);
    }
}

/**
 * Validate a code and burn it, along with every other code this number holds for
 * the same purpose. Returns false for wrong, expired, already-used or unknown
 * codes — the caller decides what to say about it.
 */
export async function consumeOtp(phone: string, code: string, type: OtpType): Promise<boolean> {
    const normalizedPhone = normalizePhone(phone);

    const valid = await prisma.verificationCode.findFirst({
        where: {
            phone: normalizedPhone,
            code: String(code),
            type,
            used: false,
            expiresAt: { gt: new Date() },
        },
    });

    if (!valid) {
        await recordRejection(normalizedPhone, String(code), type);
        return false;
    }

    // Claim it before the caller acts on it: of two requests with the same code,
    // only the one that deletes the row goes on.
    const claimed = await prisma.verificationCode.deleteMany({ where: { id: valid.id } });
    if (claimed.count === 0) return false;
    await prisma.verificationCode.deleteMany({ where: { phone: normalizedPhone, type } });

    return true;
}
