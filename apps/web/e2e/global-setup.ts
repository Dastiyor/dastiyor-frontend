import { createTask, createUser, prisma, purgeE2EData } from './support/db';
import { assertWritesAllowedHere, E2E_EMAIL_DOMAIN, E2E_SEED_TASK, E2E_SMS_PHONE } from './support/env';

/** Clears whatever an interrupted run left behind, checks the signup number is free, and seeds one task. */
export default async function globalSetup() {
    assertWritesAllowedHere();
    const removed = await purgeE2EData();
    if (removed) console.log(`[e2e] removed ${removed} leftover test account(s)`);

    const owner = await prisma.user.findFirst({ where: { phone: E2E_SMS_PHONE }, select: { email: true } });
    // One open task nothing else touches, so the feed specs have something to
    // browse on an empty database. Removed with the rest at teardown.
    if (!owner || owner.email?.endsWith(E2E_EMAIL_DOMAIN)) {
        await createTask(await createUser('CUSTOMER'), { title: E2E_SEED_TASK });
    }
    await prisma.$disconnect();
    if (owner && !owner.email?.endsWith(E2E_EMAIL_DOMAIN)) {
        throw new Error(
            `[e2e] ${E2E_SMS_PHONE} already belongs to an account outside the test domain. ` +
            'Set E2E_SMS_PHONE to a number no account uses.',
        );
    }
}
