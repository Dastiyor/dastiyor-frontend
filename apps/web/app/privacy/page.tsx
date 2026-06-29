import type { Metadata } from 'next';
import { getServerTranslation } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getServerTranslation();
    return {
        title: t('privacyPage.title'),
        description: t('privacyPage.desc'),
    };
}

const sectionStyle = { marginBottom: '40px' };
const headingStyle = { marginBottom: '12px' };
const textStyle = { color: 'var(--text-light)', lineHeight: '1.8' };
const listStyle = { color: 'var(--text-light)', lineHeight: '1.9', paddingLeft: '20px' };

export default async function PrivacyPage() {
    const { t } = await getServerTranslation();

    // Since we need to map over sections which is an array, we get the raw translation object
    // Wait, `t` only returns strings. For arrays, we need to read from the JSON directly,
    // or use a utility. Let's just use raw JSON for the array parts, or a loop over indices if we know length.
    // We'll read the full locale object.
    const { getServerTranslation: getT } = await import('@/lib/i18n/server');
    const { locale } = await getT();
    const ru = (await import('@/lib/i18n/locales/ru.json')).default;
    const tj = (await import('@/lib/i18n/locales/tj.json')).default;
    const content = locale === 'tj' ? tj.privacyPage : ru.privacyPage;

    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '800px' }}>
            <h1 className="heading-lg" style={{ marginBottom: '8px' }}>{content.heading}</h1>
            <p style={{ color: 'var(--text-light)', marginBottom: '48px', fontSize: '0.9rem' }}>
                {content.updated}
            </p>

            <section style={sectionStyle}>
                <p style={textStyle}>{content.intro}</p>
            </section>

            {content.sections.map((section, idx: number) => (
                <section key={idx} style={sectionStyle}>
                    <h2 className="heading-md" style={headingStyle}>{section.title}</h2>
                    {section.intro && <p style={{ ...textStyle, marginBottom: section.list ? '12px' : '0' }}>{section.intro}</p>}
                    {section.list && (
                        <ul style={listStyle}>
                            {section.list.map((li: string, i: number) => <li key={i}>{li}</li>)}
                        </ul>
                    )}
                    {section.outro && (
                        <p style={{ ...textStyle, marginTop: '12px' }}>
                            {section.outro}
                            {(idx === 6 || idx === 9) && <a href="mailto:support@dastiyor.com" style={{ color: 'var(--primary)' }}>support@dastiyor.com</a>}
                        </p>
                    )}
                </section>
            ))}
        </div>
    );
}