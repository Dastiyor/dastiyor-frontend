import { notFound } from 'next/navigation';
import { DevCheckoutPage } from './DevCheckoutContent';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';

export default function Page() {
    // Subscriptions are temporarily hidden — see lib/features.ts
    if (!SUBSCRIPTIONS_ENABLED || process.env.NODE_ENV === 'production') {
        notFound();
    }
    return <DevCheckoutPage />;
}
