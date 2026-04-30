'use client';
import Link from 'next/link';
import { Wrench, SprayCan, Truck, BookOpen, Droplets, Zap, Sparkles, Monitor } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function Categories() {
    const { t } = useTranslation();
    return (
        <section style={{ padding: '100px 0', backgroundColor: 'var(--white)' }}>
            <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '50px' }}>
                    <div>
                        <h2 className="heading-lg">{t('popularCategories.title')}</h2>
                        <p style={{ color: 'var(--text-light)', marginTop: '10px' }}>{t('popularCategories.subtitle')}</p>
                    </div>
                    <Link href="/tasks" style={{
                        color: 'var(--primary)',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        {t('popularCategories.viewAll')} <span>→</span>
                    </Link>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '24px'
                }}>
                    {categories.map((cat, index) => (
                        <Link href={`/tasks?category=${encodeURIComponent(cat.dbValue)}`} key={index} className="category-card" style={{
                            padding: '30px',
                            background: 'white',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            color: 'inherit'
                        }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '16px',
                                background: cat.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--primary)',
                                marginBottom: '20px'
                            }}>
                                {cat.icon}
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{t(cat.nameKey)}</h3>
                        </Link>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .category-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
                    border-color: var(--primary);
                }
            `}</style>
        </section>
    );
}

const categories = [
    { nameKey: 'popularCategories.homeRepairs', dbValue: 'Ремонт', icon: <Wrench size={28} />, bg: '#EFF6FF' },
    { nameKey: 'popularCategories.cleaning', dbValue: 'Уборка', icon: <SprayCan size={28} />, bg: '#ECFDF5' },
    { nameKey: 'popularCategories.moving', dbValue: 'Доставка', icon: <Truck size={28} />, bg: '#FFF7ED' },
    { nameKey: 'popularCategories.tutors', dbValue: 'Обучение', icon: <BookOpen size={28} />, bg: '#F5F3FF' },
    { nameKey: 'popularCategories.plumbing', dbValue: 'Сантехника', icon: <Droplets size={28} />, bg: '#EFF6FF' },
    { nameKey: 'popularCategories.electrician', dbValue: 'Электрик', icon: <Zap size={28} />, bg: '#FFFBEB' },
    { nameKey: 'popularCategories.beauty', dbValue: 'Красота', icon: <Sparkles size={28} />, bg: '#FDF2F8' },
    { nameKey: 'popularCategories.techHelp', dbValue: 'IT и Веб', icon: <Monitor size={28} />, bg: '#F0F9FF' },
];
