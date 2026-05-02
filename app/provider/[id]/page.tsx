import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReviewList from '@/components/reviews/ReviewList';
import { CheckCircle, MessageSquare, Star, Calendar, Award, TrendingUp } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';

type Props = {
    params: { id: string };
};

export default async function ProviderProfilePage({ params }: Props) {
    const { id } = await params;

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            fullName: true,
            bio: true,
            skills: true,
            avatar: true,
            role: true,
            createdAt: true,
            subscription: {
                select: { plan: true, isActive: true, endDate: true }
            },
            _count: {
                select: {
                    assignedTasks: true,
                    responses: true
                }
            }
        }
    });

    if (!user || user.role !== 'PROVIDER') {
        notFound();
    }

    // Get detailed task statistics
    const [completedTasks, inProgressTasks, totalAssigned] = await Promise.all([
        prisma.task.count({ where: { assignedUserId: id, status: 'COMPLETED' } }),
        prisma.task.count({ where: { assignedUserId: id, status: 'IN_PROGRESS' } }),
        prisma.task.count({ where: { assignedUserId: id } })
    ]);

    // Get reviews
    const reviews = await prisma.review.findMany({
        where: { reviewedId: id },
        orderBy: { createdAt: 'desc' },
        include: {
            reviewer: {
                select: { id: true, fullName: true }
            },
            task: {
                select: { id: true, title: true, category: true }
            }
        }
    });

    // Calculate stats
    const totalRating = reviews.reduce((sum: number, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    const breakdown = {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length,
    };

    const skills = user.skills ? user.skills.split(',').map(s => s.trim()) : [];
    const { t } = await getServerTranslation();

    // Calculate success rate
    const successRate = totalAssigned > 0 ? Math.round((completedTasks / totalAssigned) * 100) : 0;

    // Check if premium
    const isPremium = user.subscription?.isActive &&
        new Date(user.subscription.endDate) > new Date() &&
        user.subscription.plan.toLowerCase() === 'premium';

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '60px 0' }}>
            <div className="container" style={{ maxWidth: '900px' }}>
                {/* Profile Header */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    padding: '40px',
                    marginBottom: '32px',
                    border: '1px solid var(--border)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Premium badge */}
                    {isPremium && (
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            backgroundColor: '#7C3AED',
                            color: 'white',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <Award size={14} />
                            Premium
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
                        {/* Avatar */}
                        <div style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            backgroundColor: user.avatar ? 'transparent' : 'var(--primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '3rem',
                            fontWeight: 'bold',
                            flexShrink: 0,
                            overflow: 'hidden',
                            border: '4px solid var(--accent)'
                        }}>
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.fullName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                user.fullName[0]
                            )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>
                                        {user.fullName}
                                    </h1>
                                    <p style={{ color: 'var(--accent)', fontWeight: '600', marginBottom: '8px' }}>
                                        {t('reviews_page.provider')}
                                    </p>
                                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={14} />
                                        {t('reviews_page.onPlatformSince')} {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>

                                {/* Rating */}
                                <div style={{ textAlign: 'center', padding: '16px 24px', backgroundColor: '#fef3c7', borderRadius: '16px' }}>
                                    <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#92400e' }}>
                                        {averageRating.toFixed(1)}
                                    </div>
                                    <div style={{ color: '#fbbf24', fontSize: '1.2rem' }}>
                                        {'★'.repeat(Math.round(averageRating))}{'☆'.repeat(5 - Math.round(averageRating))}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#92400e', marginTop: '4px' }}>
                                        {reviews.length} {t('reviews_page.reviews')}
                                    </div>
                                </div>
                            </div>

                            {/* Bio */}
                            {user.bio && (
                                <p style={{
                                    marginTop: '20px',
                                    lineHeight: '1.7',
                                    color: 'var(--text)',
                                    padding: '16px',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '12px'
                                }}>
                                    {user.bio}
                                </p>
                            )}

                            {/* Skills */}
                            {skills.length > 0 && (
                                <div style={{ marginTop: '20px' }}>
                                    <p style={{ fontWeight: '600', marginBottom: '12px' }}>{t('profile.skills')}</p>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {skills.map((skill, i) => (
                                            <span
                                                key={i}
                                                style={{
                                                    backgroundColor: '#EEF2FF',
                                                    color: '#6366F1',
                                                    padding: '6px 14px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Statistics Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px',
                    marginBottom: '32px'
                }}>
                    <StatCard
                        icon={<CheckCircle size={24} />}
                        value={completedTasks}
                        label={t('reviews_page.completed')}
                        color="#10B981"
                        bgColor="#D1FAE5"
                    />
                    <StatCard
                        icon={<TrendingUp size={24} />}
                        value={`${successRate}%`}
                        label={t('reviews_page.successRate')}
                        color="#6366F1"
                        bgColor="#EEF2FF"
                    />
                    <StatCard
                        icon={<MessageSquare size={24} />}
                        value={user._count.responses}
                        label={t('reviews_page.responses')}
                        color="#F59E0B"
                        bgColor="#FEF3C7"
                    />
                    <StatCard
                        icon={<Star size={24} />}
                        value={reviews.length}
                        label={t('reviews_page.reviews')}
                        color="#EC4899"
                        bgColor="#FCE7F3"
                    />
                </div>

                {/* Reviews Section */}
                <h2 className="heading-md" style={{ marginBottom: '24px' }}>
                    {t('reviews_page.reviewsTitle')} ({reviews.length})
                </h2>

                <ReviewList
                    reviews={reviews}
                    stats={{
                        totalReviews: reviews.length,
                        averageRating,
                        breakdown
                    }}
                />

                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <Link href="/tasks" className="btn btn-primary">
                        {t('reviews_page.viewAvailableTasks')}
                    </Link>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, value, label, color, bgColor }: {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    color: string;
    bgColor: string;
}) {
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid var(--border)',
            textAlign: 'center'
        }}>
            <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                backgroundColor: bgColor,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
            }}>
                {icon}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color }}>
                {value}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '4px' }}>
                {label}
            </div>
        </div>
    );
}
