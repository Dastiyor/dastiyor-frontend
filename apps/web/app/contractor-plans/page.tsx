import { redirect } from 'next/navigation';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';

/** Old address of the plans page; /subscription is public now. */
export default function ContractorPlansPage() {
    redirect(SUBSCRIPTIONS_ENABLED ? '/subscription' : '/');
}
