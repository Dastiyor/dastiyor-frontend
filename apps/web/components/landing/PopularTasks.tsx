import Link from 'next/link';
import { MapPin, Wallet, Star } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getServerTranslation } from '@/lib/i18n/server';
import { formatBudget } from '@/lib/format-budget';
import { formatTaskDate } from '@/lib/format-date';

type CardTask = {
    href: string;
    category: string;
    timeAgo: string;
    title: string;
    location: string;
    budget: string;
    featured: boolean;
};

/**
 * Three real open tasks: featured ones first (capped at 3, the same cap the apps
 * and the DB trigger enforce), then the newest. Never made-up examples.
 */
async function getCards(): Promise<CardTask[]> {
    try {
        const tasks = await prisma.task.findMany({
            where: { status: 'OPEN' },
            orderBy: [{ featured: 'desc' }, { featuredAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
            take: 3,
        });
        return tasks.map((task) => ({
            href: `/tasks/${task.id}`,
            category: task.category,
            timeAgo: formatTaskDate(task.createdAt.toISOString()),
            title: task.title,
            location: task.city,
            budget: formatBudget(task.budgetType, task.budgetAmount),
            featured: task.featured,
        }));
    } catch (error) {
        console.error('Home page tasks:', error);
        return [];
    }
}

export default async function PopularTasks() {
    const { t, tr } = await getServerTranslation();

    const cards = await getCards();
    // No open tasks: no section.
    if (cards.length === 0) return null;

    return (
        <section className="popular-tasks-section" style={{ padding: '100px 0', backgroundColor: '#F9FAFB' }}>
            <div className="container">
                <div className="popular-tasks-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '40px' }}>
                    <div>
                        <h2 className="heading-lg">{t('popularTasks.title')}</h2>
                        <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>
                            {t('popularTasks.subtitle')}
                        </p>
                    </div>
                    <Link href="/tasks" className="btn btn-outline" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
                        {t('popularTasks.viewAll')}
                    </Link>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '24px'
                }}>
                    {cards.map((task) => (
                        <div key={task.href} className="card-hover" style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            border: task.featured ? '1px solid #F59E0B' : '1px solid var(--border)',
                            boxShadow: task.featured ? '0 4px 16px rgba(245,158,11,0.18)' : undefined,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {task.featured && (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            backgroundColor: '#FEF3C7',
                                            color: '#B45309',
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                            padding: '4px 12px',
                                            borderRadius: '20px'
                                        }}>
                                            <Star size={12} fill="#B45309" /> {t('tasks.featured')}
                                        </span>
                                    )}
                                    <span style={{
                                        backgroundColor: '#EFF6FF',
                                        color: 'var(--primary)',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        padding: '4px 12px',
                                        borderRadius: '20px'
                                    }}>
                                        {tr(task.category)}
                                    </span>
                                </div>
                                <span style={{ color: 'var(--text-light)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                    {task.timeAgo}
                                </span>
                            </div>

                            <Link href={task.href} style={{ fontSize: '1.25rem', fontWeight: '700', lineHeight: '1.4' }}>
                                {task.title}
                            </Link>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: 'var(--text-light)', fontSize: '0.95rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MapPin size={16} />
                                    {tr(task.location)}
                                </div>
                            </div>

                            <div style={{
                                marginTop: 'auto',
                                paddingTop: '16px',
                                borderTop: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: '700', fontSize: '1.1rem' }}>
                                    <Wallet size={20} />
                                    {tr(task.budget)}
                                </div>
                                <Link href={task.href} style={{
                                    color: 'var(--primary)',
                                    fontWeight: '600',
                                    fontSize: '0.95rem'
                                }}>
                                    {t('popularTasks.view')}
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            <style>{`
                @media (max-width: 768px) {
                    .popular-tasks-section { padding: 60px 0 !important; }
                    .popular-tasks-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; margin-bottom: 28px !important; }
                }
            `}</style>
            </div>
        </section>
    );
}
