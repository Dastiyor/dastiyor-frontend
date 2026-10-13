import { test, expect, loginAs } from '../support/test';
import { createUser, prisma } from '../support/db';

// Routes nothing else reaches: the dashboard's own "create task" address, the
// paid-plan pages while plans are closed, and the standalone code check.

test('the dashboard create-task address opens the task form', async ({ page }) => {
    await loginAs(page, await createUser('CUSTOMER'));
    await page.goto('/customer/create-task');
    await expect.poll(() => new URL(page.url()).pathname).toBe('/create-task');
    await expect(page.locator('form, input, textarea').first()).toBeVisible();
});

test('the paid-plan pages are closed while plans are off', async ({ page }) => {
    await page.goto('/subscription-expired');
    expect(new URL(page.url()).pathname).toBe('/');

    const checkout = await page.goto('/payment/dev-checkout');
    expect(checkout?.status()).toBe(404);
});

// Each user has their own number, and the code is written straight to the
// table: the route under test is the check, not the send. Teardown removes
// codes for the suite's numbers.
async function issueCode(phone: string, type = 'REGISTRATION', expiresInMs = 60_000) {
    const code = String(100000 + Math.floor(Math.random() * 900000));
    await prisma.verificationCode.deleteMany({ where: { phone, type } });
    await prisma.verificationCode.create({
        data: { phone, code, type, expiresAt: new Date(Date.now() + expiresInMs) },
    });
    return code;
}

test('a code is accepted once, for its own number and purpose only', async ({ request }) => {
    const user = await createUser('CUSTOMER');
    const other = await createUser('CUSTOMER');
    const check = (data: object) => request.post('/api/auth/verify-check', { data });

    expect((await check({ phone: user.phone })).status()).toBe(400);
    expect((await check({ code: '123456' })).status()).toBe(400);

    // Three checks per number per 15 minutes, so the guesses go to the other one.
    const code = await issueCode(user.phone);
    const otherCode = await issueCode(other.phone);
    expect((await check({ phone: other.phone, code: otherCode === code ? '000000' : code })).status()).toBe(400);
    expect((await check({ phone: user.phone, code, type: 'RESET_PASSWORD' })).status()).toBe(400);

    expect((await check({ phone: user.phone, code })).status()).toBe(200);
    expect((await check({ phone: user.phone, code })).status()).toBe(400);
});

test('an expired code is refused', async ({ request }) => {
    const user = await createUser('CUSTOMER');
    const code = await issueCode(user.phone, 'REGISTRATION', -1000);
    const res = await request.post('/api/auth/verify-check', { data: { phone: user.phone, code } });
    expect(res.status()).toBe(400);
});

test('confirming a phone code does not make a provider "verified"', async ({ request }) => {
    // isVerified is the admin's approval of a provider's documents.
    const provider = await createUser('PROVIDER');
    const code = await issueCode(provider.phone, 'LOGIN');
    const res = await request.post('/api/auth/verify-check', {
        data: { phone: provider.phone, code, type: 'LOGIN' },
    });
    expect(res.status()).toBe(200);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: provider.id } });
    expect(after.isVerified).toBe(false);
});
