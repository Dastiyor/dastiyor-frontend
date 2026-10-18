import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/categories';
import { getCompany } from '@/lib/company';
import { CITIES, ESTIMATED_TIMES } from '@/lib/config-fallback';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';

export const revalidate = 3600;

export async function GET() {
    return NextResponse.json({
        categories: await getCategories(),
        cities: CITIES,
        estimatedTimes: ESTIMATED_TIMES,
        subscriptionsEnabled: SUBSCRIPTIONS_ENABLED,
        // Kill switch for the in-app purchase screens until the store products are approved.
        mobilePurchaseEnabled: process.env.MOBILE_PURCHASE_ENABLED === 'true',
        // Contacts for the app's Contact us / Report an issue (admin → Settings → Company).
        company: await getCompany(),
    });
}
