import { test, expect, loginAs, newSession } from '../support/test';
import { createTask, createUser, prisma, type E2EUser } from '../support/db';
import { WRITE_RUN_ENV } from '../support/env';
import { createHmac, randomUUID } from 'crypto';

// Paid plans are switched off for launch, and the server here runs with the
// launch flags (WRITE_RUN_ENV). So this checks two things: that the product
// really is free and the purchase closed, and that the payment plumbing which
// stays live behind the flag — SmartPay's webhook and the nightly expiry job —
// behaves. SmartPay's own checkout page is theirs and is not exercised.

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

        const buy = await page.request.post('/api/subscription', { data: { plan: 'basic' } });
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

test.describe('SmartPay webhook', () => {
    async function pendingPayment(user: E2EUser, plan = 'basic', amount = 99) {
        return prisma.payment.create({
            data: {
                userId: user.id,
                amount,
                type: 'SUBSCRIPTION',
                description: 'E2E subscription payment',
                plan,
                smartpayOrderId: `e2e-order-${randomUUID()}`,
            },
        });
    }

    function callback(orderId: string, amount: number, status: 'success' | 'failed' | 'cancelled', secret = WRITE_RUN_ENV.SMARTPAY_SECRET_KEY) {
        const transactionId = `e2e-tx-${randomUUID()}`;
        const signature = createHmac('sha256', secret).update(`${transactionId}:${orderId}:${amount}:${status}`).digest('hex');
        return { transaction_id: transactionId, order_id: orderId, amount, status, payment_method: 'visa', signature };
    }

    test('a paid callback activates the plan, once', async ({ request }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const payment = await pendingPayment(provider);
        const body = callback(payment.smartpayOrderId!, 99, 'success');

        expect((await request.post('/api/webhooks/smartpay', { data: body })).status()).toBe(200);
        expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('COMPLETED');

        const subscription = await prisma.subscription.findUniqueOrThrow({ where: { userId: provider.id } });
        expect(subscription).toMatchObject({ plan: 'basic', isActive: true });
        const days = (subscription.endDate.getTime() - Date.now()) / 864e5;
        expect(days).toBeGreaterThan(6.9);
        expect(days).toBeLessThan(7.1);
        expect(await prisma.notification.count({ where: { userId: provider.id } })).toBe(1);

        // SmartPay retries callbacks; a repeat must not add a second week.
        await request.post('/api/webhooks/smartpay', { data: body });
        const after = await prisma.subscription.findUniqueOrThrow({ where: { userId: provider.id } });
        expect(after.endDate.getTime()).toBe(subscription.endDate.getTime());
        expect(await prisma.notification.count({ where: { userId: provider.id } })).toBe(1);
    });

    test('a forged callback changes nothing', async ({ request }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const payment = await pendingPayment(provider);
        const orderId = payment.smartpayOrderId!;

        const forgeries = [
            callback(orderId, 99, 'success', 'not-the-secret'),
            { ...callback(orderId, 99, 'success'), signature: '' },
            // Signed for a failure, replayed as a success.
            { ...callback(orderId, 99, 'failed'), status: 'success' },
            // Signed for another amount.
            { ...callback(orderId, 1, 'success'), amount: 99 },
        ];
        for (const body of forgeries) {
            expect((await request.post('/api/webhooks/smartpay', { data: body })).status()).toBe(403);
        }

        expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
        expect(await prisma.subscription.count({ where: { userId: provider.id } })).toBe(0);
    });

    test('a failed payment is recorded and grants nothing', async ({ request }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const payment = await pendingPayment(provider);

        const res = await request.post('/api/webhooks/smartpay', { data: callback(payment.smartpayOrderId!, 99, 'failed') });
        expect(res.status()).toBe(200);
        expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('FAILED');
        expect(await prisma.subscription.count({ where: { userId: provider.id } })).toBe(0);
    });

    test('a callback for an order we never created is a 404', async ({ request }) => {
        const res = await request.post('/api/webhooks/smartpay', { data: callback('e2e-no-such-order', 99, 'success') });
        expect(res.status()).toBe(404);
    });

    test('only the payer can look up a payment', async ({ page, browser }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const payment = await pendingPayment(provider);
        await loginAs(page, provider);

        const mine = await page.request.get(`/api/payments/status?orderId=${payment.smartpayOrderId}`);
        expect(await mine.json()).toMatchObject({ status: 'PENDING' });

        const { context, page: strangerPage } = await newSession(browser, await createUser('PROVIDER'));
        const theirs = await strangerPage.request.get(`/api/payments/status?orderId=${payment.smartpayOrderId}`);
        expect(theirs.status()).toBe(403);
        await context.close();
    });
});

test('the nightly job expires overdue subscriptions and needs its secret', async ({ request }) => {
    const provider = await createUser('PROVIDER', { subscription: false });
    await prisma.subscription.create({
        data: { userId: provider.id, plan: 'basic', endDate: new Date(Date.now() - 864e5), isActive: true },
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
