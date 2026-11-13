import Link from 'next/link';
import { BadgeCheck, MapPin, Star } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';
import { getRecommendedProviders, type RecommendationTask } from '@/lib/recommended-providers';
import TierBadge, { tierCardStyle } from '@/components/TierBadge';
import styles from '@/app/professionals/professionals.module.css';

/**
 * "Рекомендуемые исполнители" on the customer's own OPEN task. Server-rendered:
 * plain links, nothing to hydrate. The cards are the /professionals directory
 * card in a shorter form (no category chips: they all share the task's).
 */
export default async function RecommendedProviders({ task }: { task: RecommendationTask }) {
    const [{ t, tr }, providers] = await Promise.all([
        getServerTranslation(),
        // A failed lookup must not take the task page down with it.
        getRecommendedProviders(task).catch((error) => {
            console.error('Recommended Providers Error:', error);
            return [];
        }),
    ]);
    if (providers.length === 0) return null;

    return (
        <section aria-labelledby="recommended-title" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <h2 id="recommended-title" className="heading-md">{t('recommended.title')}</h2>
                <Link href={`/professionals?category=${encodeURIComponent(task.category)}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                    {t('recommended.viewAll')}
                </Link>
            </div>
            <p style={{ color: 'var(--text-light)', marginBottom: '16px' }}>{t('recommended.subtitle')}</p>
            <div className={styles.grid}>
                {providers.map((pro) => (
                    <Link key={pro.id} href={`/provider/${pro.id}`} className={styles.card} style={tierCardStyle(pro.tier)}>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                            <div className={styles.avatar}>
                                {pro.avatar
                                    ? <img src={pro.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : pro.fullName[0]}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <h3 style={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pro.fullName}</span>
                                    {pro.isVerified && <BadgeCheck size={16} color="#059669" aria-label={t('reviews_page.verified')} />}
                                </h3>
                                <TierBadge tier={pro.tier} size="sm" />
                            </div>
                        </div>
                        <div className={styles.meta}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#92400e', fontWeight: 700 }}>
                                <Star size={14} fill="#fbbf24" color="#fbbf24" aria-hidden />
                                {pro.avgRating != null ? pro.avgRating.toFixed(1) : '—'}
                            </span>
                            <span>{t('professionals.reviewsCount', { n: pro.reviewCount })}</span>
                            <span>{t('professionals.completedCount', { n: pro.completedCount })}</span>
                            {pro.city && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={13} aria-hidden />{tr(pro.city)}
                                </span>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
