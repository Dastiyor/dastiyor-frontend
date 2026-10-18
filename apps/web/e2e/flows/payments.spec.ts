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

    /** SmartPay's payment webhook body: amounts in dirams, HMAC over date|amount|order|bank|invoice. */
    function callback(orderId: string, somoni: number, secret = WRITE_RUN_ENV.SMARTPAY_WEBHOOK_SECRET) {
        const body = {
            payment_date: new Date().toISOString(),
            amount: somoni * 100,
            order_id: orderId,
            bank_id: 1,
            invoice_uuid: randomUUID(),
            payment_id: `e2e-tx-${randomUUID()}`,
            bank: 'Alif',
        };
        const date = body.payment_date.replace('T', ' ').slice(0, 19);
        const signature = createHmac('sha256', secret)
            .update(`${date}|${body.amount}|${body.order_id}|${body.bank_id}|${body.invoice_uuid}`)
            .digest('hex');
        return { ...body, signature };
    }

    test('a paid callback activates the plan, once', async ({ request }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const payment = await pendingPayment(provider);
        const body = callback(payment.smartpayOrderId!, 99);

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
            callback(orderId, 99, 'not-the-secret'),
            { ...callback(orderId, 99), signature: '' },
            // Signed for 1 somoni, replayed as 99.
            { ...callback(orderId, 1), amount: 9900 },
            // Signed for another order.
            { ...callback('e2e-other-order', 99), order_id: orderId },
        ];
        for (const body of forgeries) {
            expect((await request.post('/api/webhooks/smartpay', { data: body })).status()).toBe(403);
        }

        expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
        expect(await prisma.subscription.count({ where: { userId: provider.id } })).toBe(0);
    });

    test('a payment for the wrong amount grants nothing', async ({ request }) => {
        const provider = await createUser('PROVIDER', { subscription: false });
        const payment = await pendingPayment(provider);

        // Correctly signed, but SmartPay says 50 somoni were paid for a 99 somoni plan.
        const res = await request.post('/api/webhooks/smartpay', { data: callback(payment.smartpayOrderId!, 50) });
        expect(res.status()).toBe(200);
        expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
        expect(await prisma.subscription.count({ where: { userId: provider.id } })).toBe(0);
    });

    test('a callback for an order we never created is a 404', async ({ request }) => {
        const res = await request.post('/api/webhooks/smartpay', { data: callback('e2e-no-such-order', 99) });
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
