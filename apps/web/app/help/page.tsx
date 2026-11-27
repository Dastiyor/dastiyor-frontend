import type { Metadata } from 'next';
import { getServerTranslation } from '@/lib/i18n/server';
import { helpContent } from '@/lib/i18n/pages/help';

export async function generateMetadata(): Promise<Metadata> {
    const { locale } = await getServerTranslation();
    const { title, description } = helpContent[locale];
    return { alternates: { canonical: '/help' }, title, description };
}

export default async function HelpPage() {
    const { locale } = await getServerTranslation();
    const page = helpContent[locale];

    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '800px' }}>
            <h1 className="heading-lg" style={{ marginBottom: '16px' }}>{page.heading}</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-light)', marginBottom: '48px' }}>
                {page.intro}{' '}
                <a href="mailto:support@dastiyor.com" rel="nofollow" style={{ color: 'var(--primary)' }}>{page.writeUs}</a>.
            </p>

            {page.sections.map((group) => (
                <div key={group.section} style={{ marginBottom: '48px' }}>
                    <h2 className="heading-md" style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '2px solid var(--border)' }}>
                        {group.section}
                    </h2>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {group.items.map((item, i) => (
                            <div key={i} style={{ padding: '24px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>{item.q}</h3>
                                <p style={{ color: 'var(--text-light)', lineHeight: '1.7', margin: 0 }}>{item.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div style={{ padding: '32px', backgroundColor: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <p style={{ fontWeight: '600', marginBottom: '8px' }}>{page.moreTitle}</p>
                <p style={{ color: 'var(--text-light)', marginBottom: '20px' }}>
                    {page.hours}
                </p>
                <a href="mailto:support@dastiyor.com" rel="nofollow" className="btn btn-primary" style={{ display: 'inline-block', padding: '12px 28px' }}>
                    {page.contact}
                </a>
            </div>
        </div>
    );
}
