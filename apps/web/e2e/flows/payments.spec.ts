import { test, expect, loginAs, newSession } from '../support/test';
import { createTask, createUser, prisma, type E2EUser } from '../support/db';
import { WRITE_RUN_ENV } from '../support/env';
import { createHmac, randomUUID } from 'crypto';
import { alifSays } from '../support/providers';

// Paid plans are switched off for launch, and the server here runs with the
// launch flags (WRITE_RUN_ENV). So this checks two things: that the product
// really is free and the purchase closed, and that the payment plumbing which
// stays live behind the flag — Alif's payment notice and the nightly expiry job —
// behaves. Alif's own payment form is theirs and is not exercised; its /checktxn
// is played by e2e/support/fake-providers.js.

test.describe('at launch', () => {
    test('a provider with no subscription can respond to tasks', async ({ page }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const task = await createTask(await createUser('CUSTOMER'));
        await loginAs(page, provider);

        const res = await page.request.post('/api/responses', {
            data: { taskId: task.id, price: '100', message: 'Готов выполнить это задание сегодня.' },
        });
        expect(res.status(), await res.text()).toBeLessThan(300);
    });

    test('buying a plan is closed, in the API and in the pages', async ({ page }) => {
        await loginAs(page, await createUser('PROVIDER', { subscription: false }));

        const buy = await page.request.post('/api/subscription', { data: { plan: 'pro' } });
        expect(buy.status()).toBe(404);
        expect(await prisma.payment.count({ where: { user: { email: { contains: '@e2e.' } }, status: 'PENDING' } })).toBe(0);

        for (const path of ['/provider/subscription', '/provider/payment-history']) {
            await page.goto(path);
            await expect(page, path).toHaveURL(/\/provider$/);
        }
        for (const path of ['/subscription', '/payment/result?orderId=x']) {
            await page.goto(path);
            await expect(page, path).toHaveURL(url => url.pathname === '/');
        }
    });
});

test.describe('Alif payment notice', () => {
    async function pendingPayment(user: E2EUser, plan = 'pro', amount = 49) {
        return prisma.payment.create({
            data: {
                userId: user.id,
                amount,
                type: 'SUBSCRIPTION',
                description: 'E2E subscription payment',
                plan,
                orderId: `e2e-order-${randomUUID()}`,
            },
        });
    }

    const hmac = (key: string, msg: string) => createHmac('sha256', key).update(msg).digest('hex');
    const token = (fields: string[], password = WRITE_RUN_ENV.ALIF_TERMINAL_PASSWORD) =>
        hmac(hmac(WRITE_RUN_ENV.ALIF_TERMINAL_ID, password), fields.join(''));

    /** Alif's payment notice: signed over orderId + status + transactionId (not the amount). */
    function notice(orderId: string, status: string, transactionId = '777001', password?: string) {
        return {
            orderId, transactionId, status, event: 'payment', amount: 49,
            account: '505827******9872', transaction_type: 'korti_milli',
            token: token([orderId, status, transactionId], password),
        };
    }

    test('a paid notice activates the plan, once', async ({ request }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const payment = await pendingPayment(provider);
        alifSays(payment.orderId!, { status: 'ok', amount: 49, transactionId: '777001' });
        const body = notice(payment.orderId!, 'ok');

        expect((await request.post('/api/webhooks/alif', { data: body })).status()).toBe(200);
        const completed = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
        expect(completed).toMatchObject({ status: 'COMPLETED', transactionId: '777001', paymentMethod: 'korti_milli' });

        const subscription = await prisma.subscription.findUniqueOrThrow({ where: { userId: provider.id } });
        expect(subscription).toMatchObject({ plan: 'pro', isActive: true });
        const days = (subscription.endDate.getTime() - Date.now()) / 864e5;
        expect(days).toBeGreaterThan(29.9);
        expect(days).toBeLessThan(30.1);
        expect(await prisma.notification.count({ where: { userId: provider.id } })).toBe(1);

        // Alif may deliver a notice twice; a repeat must not add a second month.
        expect((await request.post('/api/webhooks/alif', { data: body })).status()).toBe(200);
        const after = await prisma.subscription.findUniqueOrThrow({ where: { userId: provider.id } });
        expect(after.endDate.getTime()).toBe(subscription.endDate.getTime());
        expect(await prisma.notification.count({ where: { userId: provider.id } })).toBe(1);
    });

    test('a forged notice changes nothing', async ({ request }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const payment = await pendingPayment(provider);
        const orderId = payment.orderId!;
        alifSays(orderId, { status: 'pending', amount: 49 });

        const forgeries = [
            notice(orderId, 'ok', '777001', 'not-the-password'),
            { ...notice(orderId, 'ok'), token: '' },
            // Signed as failed, replayed as ok.
            { ...notice(orderId, 'failed'), status: 'ok' },
            // Signed for another order.
            { ...notice('e2e-other-order', 'ok'), orderId },
        ];
        for (const body of forgeries) {
            expect((await request.post('/api/webhooks/alif', { data: body })).status()).toBe(403);
        }

        expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
        expect(await prisma.subscription.count({ where: { userId: provider.id } })).toBe(0);
    });

    test('a signed ok notice that Alif does not confirm grants nothing', async ({ request }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const payment = await pendingPayment(provider);
        alifSays(payment.orderId!, { status: 'pending', amount: 49 });

        expect((await request.post('/api/webhooks/alif', { data: notice(payment.orderId!, 'ok') })).status()).toBe(200);
        expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
        expect(await prisma.subscription.count({ where: { userId: provider.id } })).toBe(0);
    });

    test('a payment for the wrong amount grants nothing', async ({ request }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const payment = await pendingPayment(provider);
        // Alif confirms 1 somoni paid for a 49 somoni plan.
        alifSays(payment.orderId!, { status: 'ok', amount: 1 });

        const res = await request.post('/api/webhooks/alif', { data: notice(payment.orderId!, 'ok') });
        expect(res.status()).toBe(200);
        expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
        expect(await prisma.subscription.count({ where: { userId: provider.id } })).toBe(0);
    });

    test('a failed notice marks the payment failed', async ({ request }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const payment = await pendingPayment(provider);

        expect((await request.post('/api/webhooks/alif', { data: notice(payment.orderId!, 'failed') })).status()).toBe(200);
        expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('FAILED');
    });

    test('a notice for an order we never created is answered, and changes nothing', async ({ request }) => {
        const res = await request.post('/api/webhooks/alif', { data: notice('e2e-no-such-order', 'ok') });
        expect(res.status()).toBe(200);
        expect(await res.json()).toMatchObject({ ok: false, message: 'Payment not found' });
    });

    test('the status check completes a paid order whose notice never arrived', async ({ page }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const payment = await pendingPayment(provider);
        await loginAs(page, provider);

        const before = await page.request.get(`/api/payments/status?orderId=${payment.orderId}`);
        expect(await before.json()).toMatchObject({ status: 'PENDING' });

        alifSays(payment.orderId!, { status: 'ok', amount: 49 });
        const after = await page.request.get(`/api/payments/status?orderId=${payment.orderId}`);
        expect(await after.json()).toMatchObject({ status: 'COMPLETED', planName: 'PRO' });
        expect(await prisma.subscription.findUniqueOrThrow({ where: { userId: provider.id } })).toMatchObject({ plan: 'pro', isActive: true });
    });

    test('only the payer can look up a payment', async ({ page, browser }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const payment = await pendingPayment(provider);
        await loginAs(page, provider);

        const mine = await page.request.get(`/api/payments/status?orderId=${payment.orderId}`);
        expect(await mine.json()).toMatchObject({ status: 'PENDING' });

        const { context, page: strangerPage } = await newSession(browser, await createUser('PROVIDER'));
        const theirs = await strangerPage.request.get(`/api/payments/status?orderId=${payment.orderId}`);
        expect(theirs.status()).toBe(403);
        await context.close();
    });
});

test('the nightly job expires overdue subscriptions and needs its secret', async ({ request }) => {
    const provider = await createUser('PROVIDER', { subscription: false });
    await prisma.subscription.create({
        data: { userId: provider.id, plan: 'pro', endDate: new Date(Date.now() - 864e5), isActive: true },
    });

    expect((await request.get('/api/cron/expire-subscriptions')).status()).toBe(401);
    const wrong = await request.get('/api/cron/expire-subscriptions', { headers: { Authorization: 'Bearer nope' } });
    expect(wrong.status()).toBe(401);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { userId: provider.id } })).isActive).toBe(true);

    const run = await request.get('/api/cron/expire-subscriptions', {
        headers: { Authorization: `Bearer ${WRITE_RUN_ENV.CRON_SECRET}` },
    });
    expect(run.status()).toBe(200);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { userId: provider.id } })).isActive).toBe(false);
});
