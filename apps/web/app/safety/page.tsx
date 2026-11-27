import type { Metadata } from 'next';
import { getServerTranslation } from '@/lib/i18n/server';
import { safetyContent } from '@/lib/i18n/pages/safety';

export async function generateMetadata(): Promise<Metadata> {
    const { locale } = await getServerTranslation();
    const { title, description } = safetyContent[locale];
    return { alternates: { canonical: '/safety' }, title, description };
}

export default async function SafetyPage() {
    const { locale } = await getServerTranslation();
    const page = safetyContent[locale];

    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '800px' }}>
            <h1 className="heading-lg" style={{ marginBottom: '16px' }}>{page.heading}</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-light)', marginBottom: '48px', lineHeight: '1.7' }}>
                {page.intro}
            </p>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>{page.checks.title}</h2>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.7' }}>
                    {page.checks.text}
                </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>{page.reviews.title}</h2>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.7' }}>
                    {page.reviews.text}
                </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>{page.payment.title}</h2>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.7' }}>
                    {page.payment.text}
                </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>{page.customers.title}</h2>
                <ul style={{ color: 'var(--text-light)', lineHeight: '1.9', paddingLeft: '20px' }}>
                    {page.customers.list.map((item) => <li key={item}>{item}</li>)}
                </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>{page.providers.title}</h2>
                <ul style={{ color: 'var(--text-light)', lineHeight: '1.9', paddingLeft: '20px' }}>
                    {page.providers.list.map((item) => <li key={item}>{item}</li>)}
                </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>{page.disputes.title}</h2>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.7' }}>
                    {page.disputes.text}
                </p>
            </section>

            <section style={{ padding: '32px', backgroundColor: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>{page.support.title}</h2>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.7', marginBottom: '12px' }}>
                    {page.support.text}
                </p>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.7' }}>
                    Email: <a href="mailto:support@dastiyor.com" rel="nofollow" style={{ color: 'var(--primary)' }}>support[at]dastiyor.com</a>
                </p>
            </section>
        </div>
    );
}
