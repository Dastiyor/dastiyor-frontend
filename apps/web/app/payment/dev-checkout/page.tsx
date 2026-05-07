import { notFound } from 'next/navigation';
import { DevCheckoutPage } from './DevCheckoutContent';

export default function Page() {
    if (process.env.NODE_ENV === 'production') {
        notFound();
    }
    return <DevCheckoutPage />;
}
