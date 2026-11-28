import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/categories';
import { getCompany } from '@/lib/company';
import { CITIES, ESTIMATED_TIMES } from '@/lib/config-fallback';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';
import { isSubscriptionSalesEnabled } from '@/lib/subscription-sales';

// Short, so the admin's subscription switch reaches the app within minutes.
export const revalidate = 60;

export async function GET() {
    const salesEnabled = await isSubscriptionSalesEnabled();
    const mobilePurchaseEnabled = salesEnabled && process.env.MOBILE_PURCHASE_ENABLED === 'true';
    return NextResponse.json({
        categories: await getCategories(),
        cities: CITIES,
        estimatedTimes: ESTIMATED_TIMES,
        // The app can sell plans before the website does (website checkout needs SmartPay).
        subscriptionsEnabled: salesEnabled && (SUBSCRIPTIONS_ENABLED || mobilePurchaseEnabled),
        // Kill switch for the in-app purchase screens until the store products are approved.
        mobilePurchaseEnabled,
        // Contacts for the app's Contact us / Report an issue (admin → Settings → Company).
        company: await getCompany(),
    });
}
