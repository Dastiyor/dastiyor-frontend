// Playwright's webServer for runs that write: a throwaway Postgres, the Prisma
// migrations, then `next dev` against it. Playwright starts the web server
// before global setup, so the database has to come up here rather than there.
//
// The connection URL and ports arrive in the environment from
// playwright.config.ts, which also hands the same URL to the tests.
import EmbeddedPostgres from 'embedded-postgres';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dbUrl = new URL(process.env.POSTGRES_PRISMA_URL);
const appPort = process.env.E2E_PORT;

// Recreated on every run, so each one starts from an empty, freshly migrated database.
const databaseDir = path.join(webRoot, 'node_modules/.cache/e2e-postgres');
fs.rmSync(databaseDir, { recursive: true, force: true });

const pg = new EmbeddedPostgres({
    databaseDir,
    user: dbUrl.username,
    password: dbUrl.password,
    port: Number(dbUrl.port),
    persistent: false,
    onLog: () => {},
    onError: message => console.error('[e2e-postgres]', message),
});

let next;
let stopping = false;
async function shutdown(code = 0) {
    if (stopping) return;
    stopping = true;
    next?.kill('SIGTERM');
    await pg.stop().catch(() => {});
    process.exit(code);
}
process.on('SIGTERM', () => shutdown());
process.on('SIGINT', () => shutdown());

try {
    await pg.initialise();
    await pg.start();
    await pg.createDatabase(dbUrl.pathname.slice(1));
    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], { cwd: webRoot, stdio: 'inherit' });
} catch (error) {
    console.error('[e2e] could not start the local database:', error);
    await shutdown(1);
}

next = spawn('pnpm', ['exec', 'next', 'dev', '-p', appPort], { cwd: webRoot, stdio: 'inherit' });
next.on('exit', code => shutdown(code ?? 1));
