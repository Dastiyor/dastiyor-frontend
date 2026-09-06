import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode } from '@/lib/notifications/sms';
import { normalizePhone } from '@/lib/validation';

/**
 * Phone OTP issue/consume, shared by phone verification (`verify-send` /
 * `verify-check`) and by password reset (`forgot-password` / `reset-password`).
 *
 * Both flows must behave identically — same expiry, same single-use rule, same
 * designated-test-number override — so they live here rather than being copied
 * into each route.
 */

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

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
 * Store a fresh code for this phone/type and text it to the user, replacing any
 * code already outstanding. Returns false only when the SMS provider rejects the
 * send — the code is stored either way, so a designated test number (or a run
 * with SMS credits exhausted) still has a usable code server-side.
 */
export async function issueOtp(phone: string, type: OtpType): Promise<boolean> {
    const normalizedPhone = normalizePhone(phone);
    const isTestPhone = isDesignatedTestPhone(normalizedPhone);
    const code = isTestPhone
        ? (process.env.SMS_TEST_CODE as string)
        : crypto.randomInt(100000, 999999).toString();

    // Replace any outstanding code for this phone/type so only the newest works
    await prisma.verificationCode.deleteMany({ where: { phone: normalizedPhone, type } });
    await prisma.verificationCode.create({
        data: { phone: normalizedPhone, code, type, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });

    if (isTestPhone) return true;
    return sendVerificationCode(normalizedPhone, code);
}

/**
 * Validate a code and burn it. Returns false for wrong, expired, already-used or
 * unknown codes — the caller decides what to say about it.
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

    if (!valid) return false;

    // Mark used before the caller acts on it, then drop it — the update is what
    // prevents a replay winning a race with the delete.
    await prisma.verificationCode.update({ where: { id: valid.id }, data: { used: true } });
    await prisma.verificationCode.delete({ where: { id: valid.id } });

    return true;
}
