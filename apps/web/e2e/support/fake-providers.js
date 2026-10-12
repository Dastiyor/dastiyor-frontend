// Stands in for Google and Apple inside the e2e server.
//
// The OAuth routes call the providers from the server, where a browser test
// cannot intercept anything, and the provider URLs are fixed in the code. So
// the server Playwright starts for a writing run is launched with
// NODE_OPTIONS=--require <this file>, which answers exactly these three URLs
// and passes every other request through untouched:
//
//   Google token exchange  → returns the `code` it was given as the access token
//   Google userinfo        → decodes that token (see googleToken() in providers.ts)
//   Apple signing keys     → the public half of a key made in global setup, so
//                            tests can sign identity tokens the routes accept
//
// Never loaded outside the e2e run; nothing in app/ or lib/ knows it exists.
const crypto = require('node:crypto');
const fs = require('node:fs');

const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';
const APPLE_KEYS = 'https://appleid.apple.com/auth/keys';
const TOKEN_PREFIX = 'e2e.';

const realFetch = globalThis.fetch;
const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function googleProfile(accessToken) {
    if (!accessToken || !accessToken.startsWith(TOKEN_PREFIX)) return null;
    try {
        return JSON.parse(Buffer.from(accessToken.slice(TOKEN_PREFIX.length), 'base64url').toString());
    } catch {
        return null;
    }
}

globalThis.fetch = async function fakeProviderFetch(input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url.startsWith(GOOGLE_TOKEN)) {
        const code = new URLSearchParams(String(init?.body ?? '')).get('code');
        return googleProfile(code) ? json({ access_token: code }) : json({ error: 'invalid_grant' }, 400);
    }

    if (url.startsWith(GOOGLE_USERINFO)) {
        const authorization = new Headers(init?.headers ?? input.headers).get('authorization') ?? '';
        const profile = googleProfile(authorization.replace(/^Bearer /, ''));
        return profile ? json(profile) : json({ error: 'invalid_token' }, 401);
    }

    if (url.startsWith(APPLE_KEYS)) {
        // Read on demand: global setup writes the key after this server is up.
        const pem = fs.readFileSync(process.env.E2E_APPLE_KEY_FILE, 'utf8');
        const jwk = crypto.createPublicKey(pem).export({ format: 'jwk' });
        return json({ keys: [{ ...jwk, kid: 'e2e', alg: 'RS256', use: 'sig' }] });
    }

    return realFetch.call(globalThis, input, init);
};
