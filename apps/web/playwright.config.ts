import { defineConfig, devices } from '@playwright/test';
import { E2E_SMS_CODE, E2E_SMS_PHONE, loadE2EEnv, usesLocalDatabase } from './e2e/support/env';

loadE2EEnv();

const PORT = Number(process.env.E2E_PORT ?? 3200);
// Point at an already-running server (a preview deployment, say) to skip the
// local one. The flows project still needs that server to share this database
// and to have SMS_TEST_PHONE / SMS_TEST_CODE set to the values in e2e/support/env.ts.
const externalBaseURL = process.env.E2E_BASE_URL;
const baseURL = externalBaseURL ?? `http://localhost:${PORT}`;

// Without this flag only the read-only smoke projects exist and the run uses
// the database in .env. With it, the flows project is added and the whole run
// moves to a throwaway local Postgres (see loadE2EEnv).
const allowWrites = process.env.E2E_ALLOW_WRITES === '1';

export default defineConfig({
    testDir: './e2e',
    outputDir: './test-results',
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    // `next dev` compiles each route on first hit; a few workers keep that from
    // turning into navigation timeouts.
    workers: 3,
    timeout: 90_000,
    expect: { timeout: 15_000 },
    reporter: [['list'], ['html', { open: 'never' }]],
    globalSetup: allowWrites ? './e2e/global-setup.ts' : undefined,
    globalTeardown: allowWrites ? './e2e/global-teardown.ts' : undefined,
    use: {
        baseURL,
        locale: 'ru-RU',
        navigationTimeout: 60_000,
        actionTimeout: 15_000,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'smoke',
            testDir: './e2e/smoke',
            testIgnore: /responsive\.spec\.ts/,
            fullyParallel: true,
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'smoke-mobile',
            testDir: './e2e/smoke',
            testMatch: /responsive\.spec\.ts/,
            use: { ...devices['Pixel 7'] },
        },
        ...(allowWrites
            ? [{
                name: 'flows',
                testDir: './e2e/flows',
                use: { ...devices['Desktop Chrome'] },
            }]
            : []),
    ],
    webServer: externalBaseURL
        ? undefined
        : {
            command: usesLocalDatabase()
                ? 'node e2e/support/start-server.mjs'
                : `pnpm exec next dev -p ${PORT}`,
            // Lets start-server.mjs stop Postgres instead of being killed mid-write.
            gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
            url: `${baseURL}/api/health`,
            // Never reuse: the env below has to be the server's env, and the
            // in-memory rate limiter has to start empty.
            reuseExistingServer: false,
            timeout: 180_000,
            env: {
                E2E_PORT: String(PORT),
                // One number gets a fixed code and no SMS (lib/otp.ts).
                SMS_TEST_PHONE: E2E_SMS_PHONE,
                SMS_TEST_CODE: E2E_SMS_CODE,
                // Blank beats .env, so no test can send a real SMS or email.
                BREVO_API_KEY: '',
                PAYOM_API_HOST: '',
                PAYOM_API_TOKEN: '',
                // In-memory rate limiting, so limits reset with the server.
                UPSTASH_REDIS_REST_URL: '',
                KV_REST_API_URL: '',
            },
        },
});
