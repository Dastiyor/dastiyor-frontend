import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReviewList from '@/components/reviews/ReviewList';
import { CheckCircle, MessageSquare, Star, Calendar, TrendingUp, BadgeCheck, MapPin, Briefcase } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';
import { getPublicProfile } from '@/lib/professionals';
import TierBadge from '@/components/TierBadge';

type Props = {
    params: Promise<{ id: string }>;
};

export default async function ProviderProfilePage({ params }: Props) {
    const { id } = await params;

    const user = await getPublicProfile(id, { reviewLimit: 100 });
    if (!user || user.role !== 'PROVIDER') {
        notFound();
    }

    const [totalAssigned, responseCount] = await Promise.all([
        prisma.task.count({ where: { assignedUserId: id } }),
        prisma.response.count({ where: { userId: id } }),
    ]);
    const completedTasks = user.completedCount;
    const averageRating = user.avgRating;
    const reviews = user.reviews;

    const skills = user.skills ? user.skills.split(',').map(s => s.trim()) : [];
    const { t, tr } = await getServerTranslation();

    // Calculate success rate
    const successRate = totalAssigned > 0 ? Math.round((completedTasks / totalAssigned) * 100) : 0;

    const years = user.experienceYears;
    const experienceKey = years == null ? null
        : years % 10 === 1 && years % 100 !== 11 ? 'reviews_page.experienceOne'
        : years % 10 >= 2 && years % 10 <= 4 && (years % 100 < 10 || years % 100 >= 20) ? 'reviews_page.experienceFew'
        : 'reviews_page.experienceMany';

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
                    {/* Paid tier badge — null while subscriptions are switched off */}
                    {user.tier && (
                        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
                            <TierBadge tier={user.tier} label={t(`subscription.${user.tier}`)} />
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
                                    <p style={{ color: 'var(--accent)', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        {t('reviews_page.provider')}
                                        {user.isVerified && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '0.85rem' }}>
                                                <BadgeCheck size={16} aria-hidden />
                                                {t('reviews_page.verified')}
                                            </span>
                                        )}
                                    </p>
                                    {(user.city || experienceKey) && (
                                        <p style={{ color: 'var(--text)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                            {user.city && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <MapPin size={14} aria-hidden />{tr(user.city)}
                                                </span>
                                            )}
                                            {experienceKey && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <Briefcase size={14} aria-hidden />{t(experienceKey, { n: years! })}
                                                </span>
                                            )}
                                        </p>
                                    )}
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
                                        {user.reviewCount} {t('reviews_page.reviews')}
                                    </div>
                                </div>
                            </div>

                            {/* Categories — label translated, link keeps the canonical value */}
                            {user.categories.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                                    {user.categories.map(c => (
                                        <Link key={c} href={`/professionals?category=${encodeURIComponent(c)}`} style={{
                                            backgroundColor: '#EFF6FF', color: 'var(--primary)', padding: '6px 14px',
                                            borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none',
                                        }}>
                                            {tr(c)}
                                        </Link>
                                    ))}
                                </div>
                            )}

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
                <div className="provider-stats-grid" style={{
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
                        value={responseCount}
                        label={t('reviews_page.responses')}
                        color="#F59E0B"
                        bgColor="#FEF3C7"
                    />
                    <StatCard
                        icon={<Star size={24} />}
                        value={user.reviewCount}
                        label={t('reviews_page.reviews')}
                        color="#EC4899"
                        bgColor="#FCE7F3"
                    />
                </div>

                {/* Portfolio */}
                {user.portfolio.length > 0 && (
                    <section aria-labelledby="portfolio-title" style={{ marginBottom: '32px' }}>
                        <h2 id="portfolio-title" className="heading-md" style={{ marginBottom: '24px' }}>
                            {t('reviews_page.portfolio')}
                        </h2>
                        <div style={{ display: 'grid', gap: '20px' }}>
                            {user.portfolio.map(p => (
                                <div key={p.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
                                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{p.title}</h3>
                                    {p.description && <p style={{ color: 'var(--text-light)', marginTop: '6px', lineHeight: 1.6 }}>{p.description}</p>}
                                    {p.images.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginTop: '14px' }}>
                                            {p.images.map((src, i) => (
                                                <a key={src + i} href={src} target="_blank" rel="noopener noreferrer">
                                                    <img src={src} alt={`${p.title} ${i + 1}`} loading="lazy"
                                                        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Reviews Section */}
                <h2 className="heading-md" style={{ marginBottom: '24px' }}>
                    {t('reviews_page.reviewsTitle')} ({user.reviewCount})
                </h2>

                <ReviewList
                    reviews={reviews}
                    stats={{
                        totalReviews: user.reviewCount,
                        averageRating,
                        breakdown: user.ratingBreakdown
                    }}
                />

                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <Link href="/tasks" className="btn btn-primary">
                        {t('reviews_page.viewAvailableTasks')}
                    </Link>
                </div>
                <style>{`
                    @media (max-width: 640px) { .provider-stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
                `}</style>
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
