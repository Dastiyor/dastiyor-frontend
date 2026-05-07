'use client';
import Link from 'next/link';
import { MapPin, Clock, Wallet } from 'lucide-react';
import { PREVIEW_TASKS } from '@/lib/landing-tasks';
import { useTranslation } from '@/lib/i18n';

export default function PopularTasks() {
    const { t } = useTranslation();
    const tasks = PREVIEW_TASKS.slice(0, 3);
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
                    {tasks.map((task, index) => (
                        <div key={index} className="card-hover" style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <span style={{
                                    backgroundColor: '#EFF6FF',
                                    color: 'var(--primary)',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    padding: '4px 12px',
                                    borderRadius: '20px'
                                }}>
                                    {task.category}
                                </span>
                                <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>
                                    {task.timeAgo}
                                </span>
                            </div>

                            <Link href={`/tasks/preview-${index}`} style={{ fontSize: '1.25rem', fontWeight: '700', lineHeight: '1.4' }}>
                                {task.title}
                            </Link>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: 'var(--text-light)', fontSize: '0.95rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MapPin size={16} />
                                    {task.location}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Clock size={16} />
                                    {task.deadline}
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
                                    {task.budget}
                                </div>
                                <Link href={`/tasks/preview-${index}`} style={{
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

