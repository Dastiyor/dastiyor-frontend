import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Star, DollarSign, Calendar } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function CompletedTasksPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        redirect('/login');
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
        redirect('/login');
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.id as string }
    });

    if (!user || user.role !== 'PROVIDER') {
        redirect('/access-denied');
    }

    const completedTasks = await prisma.task.findMany({
        where: {
            assignedUserId: user.id,
            status: 'COMPLETED'
        },
        orderBy: { updatedAt: 'desc' },
        include: {
            user: {
                select: { fullName: true, avatar: true }
            },
            review: {
                include: {
                    reviewer: {
                        select: { fullName: true }
                    }
                }
            }
        }
    });

    const stats = {
        total: completedTasks.length,
        withReviews: completedTasks.filter(t => t.review).length,
        averageRating: completedTasks
            .filter(t => t.review)
            .reduce((sum, t) => sum + (t.review?.rating || 0), 0) / completedTasks.filter(t => t.review).length || 0
    };

    const { t } = await getServerTranslation();
    const accentColor = '#0D9488';

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                    {t('provider.completedTasksTitle')}
                </h1>
                <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                    {t('provider.completedTasksDesc')}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="completed-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>{stats.total}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{t('provider.completedTasksCount')}</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#10B981', marginBottom: '4px' }}>{stats.withReviews}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{t('provider.withReviews')}</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#F59E0B', marginBottom: '4px' }}>
                        {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{t('provider.avgRating')}</div>
                </div>
            </div>

            {/* Tasks List */}
            <div style={{ display: 'grid', gap: '16px' }}>
                {completedTasks.length === 0 ? (
                    <div style={{ backgroundColor: 'white', padding: '60px', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1E293B', marginBottom: '8px' }}>{t('provider.noCompletedTasks')}</h3>
                        <p style={{ color: '#64748B', marginBottom: '20px', fontSize: '0.9rem' }}>
                            {t('provider.noCompletedTasksDesc')}
                        </p>
                        <Link href="/tasks" style={{
                            display: 'inline-block',
                            padding: '10px 20px',
                            backgroundColor: accentColor,
                            color: 'white',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '0.9rem'
                        }}>
                            {t('provider.findTasks')}
                        </Link>
                    </div>
                ) : (
                    completedTasks.map((task) => (
                        <div
                            key={task.id}
                            style={{
                                backgroundColor: 'white',
                                padding: '20px',
                                borderRadius: '16px',
                                border: '1px solid #E2E8F0'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                        <Link
                                            href={`/tasks/${task.id}`}
                                            style={{ fontSize: '1rem', fontWeight: '600', color: '#1E293B', textDecoration: 'none' }}
                                        >
                                            {task.title}
                                        </Link>
                                        <span style={{
                                            backgroundColor: '#D1FAE5',
                                            color: '#166534',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <CheckCircle size={14} />
                                            {t('provider.completedStatus')}
                                        </span>
                                    </div>

                                    <p style={{ color: '#475569', marginBottom: '12px', lineHeight: '1.5', fontSize: '0.9rem' }}>
                                        {task.description.substring(0, 150)}{task.description.length > 150 ? '...' : ''}
                                    </p>

                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748B' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <DollarSign size={14} />
                                            <span style={{ fontWeight: '600', color: accentColor }}>
                                                {task.budgetType === 'fixed' ? `${task.budgetAmount} TJS` : t('common.negotiable')}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={14} />
                                            <span>{t('provider.completedAt')} {new Date(task.updatedAt).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                        {task.review && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Star size={14} color="#F59E0B" fill="#F59E0B" />
                                                <span style={{ fontWeight: '600', color: '#F59E0B' }}>
                                                    {t('provider.ratingFrom', { rating: task.review.rating, name: task.review.reviewer.fullName })}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {task.review && task.review.comment && (
                                        <div style={{
                                            marginTop: '12px',
                                            padding: '12px',
                                            backgroundColor: '#FEF3C7',
                                            borderRadius: '8px',
                                            border: '1px solid #FDE68A'
                                        }}>
                                            <div style={{ fontWeight: '600', marginBottom: '4px', color: '#92400E', fontSize: '0.8rem' }}>
                                                {t('provider.reviewFrom', { name: task.review.reviewer.fullName })}
                                            </div>
                                            <p style={{ color: '#78350F', lineHeight: '1.5', fontSize: '0.85rem' }}>{task.review.comment}</p>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <Link
                                        href={`/tasks/${task.id}`}
                                        style={{
                                            padding: '8px 14px',
                                            backgroundColor: 'white',
                                            color: '#475569',
                                            borderRadius: '6px',
                                            textDecoration: 'none',
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
                                            border: '1px solid #E2E8F0',
                                            textAlign: 'center'
                                        }}
                                    >
                                        {t('provider.viewTask')}
                                    </Link>
                                    {task.review && (
                                        <Link
                                            href={`/reviews/${task.id}`}
                                            style={{
                                                padding: '8px 14px',
                                                backgroundColor: '#F59E0B',
                                                color: 'white',
                                                borderRadius: '6px',
                                                textDecoration: 'none',
                                                fontSize: '0.8rem',
                                                fontWeight: '600',
                                                textAlign: 'center'
                                            }}
                                        >
                                            {t('provider.viewReview')}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            <style>{`
            @media (max-width: 900px) { .completed-stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
            @media (max-width: 640px) { .completed-stats-grid { grid-template-columns: 1fr !important; } }
        `}</style>
        </div>
        </>
    );
}
