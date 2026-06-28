import Link from 'next/link';
import { Wrench, Sparkles, Truck, Laptop, Zap, Paintbrush } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function CreateTaskTemplatePage() {
    const { t } = await getServerTranslation();
    const { getServerTranslation: getT } = await import('@/lib/i18n/server');
    const { locale } = await getT();
    const ru = (await import('@/lib/i18n/locales/ru.json')).default;
    const tj = (await import('@/lib/i18n/locales/tj.json')).default;
    const content = locale === 'tj' ? tj.taskTemplates : ru.taskTemplates;
    const TEMPLATES = content.templates;
    const icons = [Wrench, Sparkles, Truck, Laptop, Zap, Paintbrush];

    return (
        <div className="container" style={{ padding: '40px 20px', maxWidth: '800px' }}>
            <h1 className="heading-lg" style={{ marginBottom: '24px' }}>{content.title}</h1>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px'
            }}>
                {TEMPLATES.map((tmpl: any, i: number) => {
                    const Icon = icons[i];
                    return (
                        <Link 
                            key={i}
                            href={`/create-task?category=${encodeURIComponent(tmpl.category)}&title=${encodeURIComponent(tmpl.title)}&description=${encodeURIComponent(tmpl.description)}`}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '16px',
                                padding: '24px',
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                textDecoration: 'none',
                                color: 'inherit',
                                transition: 'all 0.2s ease',
                            }}
                            className="hover-card"
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                backgroundColor: 'var(--primary-light)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--primary)',
                                flexShrink: 0
                            }}>
                                <Icon size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>
                                    {tmpl.name}
                                </h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', lineHeight: '1.5', margin: 0 }}>
                                    {tmpl.description}
                                </p>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}
