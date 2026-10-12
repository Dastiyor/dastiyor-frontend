import { createSign, generateKeyPairSync, randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { E2E_EMAIL_DOMAIN } from './env';

// The test side of e2e/support/fake-providers.js: makes the Google tokens it
// decodes and signs the Apple tokens its key verifies.

export const APPLE_KEY_FILE = path.resolve(__dirname, '../../node_modules/.cache/e2e-apple-key.pem');

/** Values the e2e server is started with (playwright.config.ts). */
export const OAUTH_ENV = {
    GOOGLE_CLIENT_ID: 'e2e-google-client.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'e2e-google-secret',
    APPLE_CLIENT_ID: 'tj.dastiyor.e2e.web',
    APPLE_BUNDLE_ID: 'tj.dastiyor.e2e.app',
};

/** Called once from global setup. A fresh key per run; nothing is committed. */
export function createAppleSigningKey() {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    fs.mkdirSync(path.dirname(APPLE_KEY_FILE), { recursive: true });
    fs.writeFileSync(APPLE_KEY_FILE, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
}

export type OAuthIdentity = { sub: string; email: string; name: string };

export function oauthIdentity(label: string): OAuthIdentity {
    const id = randomUUID().slice(0, 8);
    return { sub: `e2e-${label}-${id}`, email: `${label}-${id}${E2E_EMAIL_DOMAIN}`, name: 'E2E OAuth Пользователь' };
}

/** Works as both the authorisation `code` (web) and the access token (mobile). */
export function googleToken(identity: OAuthIdentity) {
    return `e2e.${Buffer.from(JSON.stringify(identity)).toString('base64url')}`;
}

/** An Apple identity token; `audience` is the web client id or the app's bundle id. */
export function appleIdToken(identity: OAuthIdentity, audience: string, overrides: Record<string, unknown> = {}) {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const signingInput = [
        encode({ alg: 'RS256', kid: 'e2e', typ: 'JWT' }),
        encode({
            iss: 'https://appleid.apple.com',
            aud: audience,
            sub: identity.sub,
            email: identity.email,
            iat: now,
            exp: now + 300,
            ...overrides,
        }),
    ].join('.');
    const signature = createSign('RSA-SHA256').update(signingInput).sign(fs.readFileSync(APPLE_KEY_FILE, 'utf8'));
    return `${signingInput}.${signature.toString('base64url')}`;
}
