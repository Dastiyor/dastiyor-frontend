import { prisma, purgeE2EData } from './support/db';
import { assertWritesAllowedHere } from './support/env';

export default async function globalTeardown() {
    // Setup refused to run here, so there is nothing of ours to remove.
    try { assertWritesAllowedHere(); } catch { return; }

    const removed = await purgeE2EData();
    await prisma.$disconnect();
    console.log(`[e2e] removed ${removed} test account(s) and their data`);
}
