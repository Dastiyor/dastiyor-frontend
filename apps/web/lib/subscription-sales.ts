import { prisma } from '@/lib/prisma';

/**
 * The admin's "sell subscriptions" switch (dastiyor-admin → Subscriptions),
 * stored as `{ "salesEnabled": boolean }` in `SystemSetting['subscriptions']`.
 *
 * It can only switch sales off: the env flags still decide whether anything is
 * sold at all. Off hides buying and lifts the response limit. It does not touch
 * what people already paid for (badges, ranking, alerts, promotions), and it
 * cannot cancel an App Store subscription.
 *
 * Only an explicit `false` turns sales off. A missing row, a broken value or a
 * failed lookup leave things as the env flags have them.
 */
export async function isSubscriptionSalesEnabled(): Promise<boolean> {
    try {
        const row = await prisma.systemSetting.findUnique({ where: { key: 'subscriptions' } });
        if (!row?.value) return true;
        return (JSON.parse(row.value) as { salesEnabled?: unknown } | null)?.salesEnabled !== false;
    } catch (err) {
        console.error('[subscription-sales] lookup failed, leaving sales on:', err);
        return true;
    }
}
