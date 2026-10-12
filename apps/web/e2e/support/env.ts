import fs from 'fs';
import path from 'path';

const WEB_ROOT = path.resolve(__dirname, '../..');

/**
 * Which database a run uses:
 *
 * - Read-only runs (no E2E_ALLOW_WRITES) use the one in `.env`.
 * - Runs that write get a throwaway local Postgres, started by
 *   e2e/support/start-server.mjs and gone when the run ends.
 * - `.env.e2e` (optional, gitignored) overrides both: give it a
 *   POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING to use a database of your own.
 *
 * The tests' own Prisma client and the server Playwright starts both inherit
 * what this sets, so they always agree.
 */
export function loadE2EEnv() {
    const e2eFile = path.join(WEB_ROOT, '.env.e2e');
    if (fs.existsSync(e2eFile)) {
        process.loadEnvFile(e2eFile);
        // Remembered in the environment so Playwright's worker processes see it too.
        process.env.E2E_OWN_DATABASE ??= /^\s*POSTGRES_PRISMA_URL\s*=/m.test(fs.readFileSync(e2eFile, 'utf8')) ? '1' : '';
    }

    if (usesLocalDatabase()) {
        process.env.POSTGRES_PRISMA_URL = LOCAL_DATABASE_URL;
        process.env.POSTGRES_URL_NON_POOLING = LOCAL_DATABASE_URL;
    }

    // loadEnvFile never overrides a variable that is already set.
    const envFile = path.join(WEB_ROOT, '.env');
    if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
}

const LOCAL_DATABASE_URL =
    `postgresql://e2e:e2e@localhost:${process.env.E2E_DB_PORT ?? 54329}/dastiyor_e2e?schema=public`;

/** True when this run should start, and talk to, the throwaway local Postgres. */
export function usesLocalDatabase() {
    return process.env.E2E_ALLOW_WRITES === '1'
        && process.env.E2E_OWN_DATABASE !== '1'
        && process.env.E2E_SHARED_DB !== '1'
        && !process.env.E2E_BASE_URL;
}

/**
 * The write flows put test accounts and tasks in whatever database they run
 * against, and open tasks show in the public feed (web and mobile) until
 * teardown removes them. They never reach the shared database by default; this
 * catches the one way left to get there by accident — E2E_BASE_URL pointing at
 * a server whose database we do not control. E2E_SHARED_DB=1 says it is meant.
 */
export function assertWritesAllowedHere() {
    if (usesLocalDatabase() || process.env.E2E_OWN_DATABASE === '1' || process.env.E2E_SHARED_DB === '1') return;
    throw new Error(
        '[e2e] The write flows would run against the shared database from .env. ' +
        'Drop E2E_BASE_URL to use the local test database, point .env.e2e at a separate one, ' +
        'or set E2E_SHARED_DB=1 to run them there on purpose.',
    );
}

/** Every account the suite creates has an address in this domain; cleanup deletes by it and by nothing else. */
export const E2E_EMAIL_DOMAIN = '@e2e.dastiyor.test';

/** Passes validatePassword() in lib/validation.ts. */
export const E2E_PASSWORD = 'E2e-Passw0rd!';

/**
 * The designated no-SMS number for signup and password reset. 000 is not an
 * operator prefix in Tajikistan, so it cannot be a subscriber's number.
 */
export const E2E_SMS_PHONE = process.env.E2E_SMS_PHONE ?? '+992000000117';
export const E2E_SMS_CODE = process.env.E2E_SMS_CODE ?? '424242';

/** Title of the open task global setup seeds for the feed specs. */
export const E2E_SEED_TASK = 'E2E-SEED Собрать шкаф-купе';
