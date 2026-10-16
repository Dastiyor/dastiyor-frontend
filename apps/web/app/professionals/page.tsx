import Link from 'next/link';
import { BadgeCheck, MapPin, Star } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';
import { getCategories } from '@/lib/categories';
import { CITIES } from '@/lib/config-fallback';
import { parseSearchParams, searchProfessionals } from '@/lib/professionals';
import TierBadge from '@/components/TierBadge';
import Filters from './Filters';
import styles from './professionals.module.css';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ProfessionalsPage({ searchParams }: Props) {
    const raw = await searchParams;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) if (typeof v === 'string') params.set(k, v);

    // The page always shows 20 per page; only the API lets clients pick a limit.
    const search = { ...parseSearchParams(params), limit: 20 };
    const [{ t, tr }, categories, result] = await Promise.all([
        getServerTranslation(),
        getCategories(),
        searchProfessionals(search),
    ]);
    const filtered = Boolean(search.q || search.category || search.city);
    const lastPage = Math.max(1, Math.ceil(result.total / result.limit));

    const pageHref = (page: number) => {
        const next = new URLSearchParams(params);
        next.delete('limit');
        if (page > 1) next.set('page', String(page)); else next.delete('page');
        const qs = next.toString();
        return qs ? `/professionals?${qs}` : '/professionals';
    };

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container">
                <div style={{ marginBottom: '24px' }}>
                    <h1 className="heading-lg" style={{ marginBottom: '8px' }}>{t('professionals.title')}</h1>
                    <p style={{ color: 'var(--text-light)', fontSize: '1.05rem' }}>{t('professionals.subtitle')}</p>
                </div>

                <Filters categories={categories} cities={CITIES} />

                {result.items.length === 0 ? (
                    <div style={{ padding: '60px 24px', textAlign: 'center', backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        {filtered ? (
                            <h3 className="heading-md" style={{ color: 'var(--text-light)' }}>{t('professionals.noResults')}</h3>
                        ) : (
                            <>
                                <h3 className="heading-md" style={{ color: 'var(--text-light)' }}>{t('professionals.noProfessionals')}</h3>
                                <p style={{ marginTop: '16px' }}>{t('professionals.becomeFirst')}</p>
                                <Link href="/register" className="btn btn-primary" style={{ marginTop: '24px', display: 'inline-block' }}>
                                    {t('professionals.registerAsProvider')}
                                </Link>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        <p style={{ color: 'var(--text-light)', marginBottom: '16px', fontVariantNumeric: 'tabular-nums' }}>
                            {t('professionals.found', { n: result.total })}
                        </p>
                        <div className={styles.grid}>
                            {result.items.map((pro) => (
                                <Link key={pro.id} href={`/provider/${pro.id}`} className={styles.card}>
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
                                            <TierBadge tier={pro.tier} label={pro.tier ? t(`subscription.${pro.tier}`) : ''} size="sm" />
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

                                    {pro.categories.length > 0 && (
                                        <div className={styles.chips}>
                                            {pro.categories.slice(0, 3).map(c => <span key={c} className={styles.chip}>{tr(c)}</span>)}
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>

                        {lastPage > 1 && (
                            <nav className={styles.pager} aria-label={t('professionals.pagination')}>
                                {result.page > 1 && <Link href={pageHref(result.page - 1)} className="btn btn-outline">{t('professionals.prev')}</Link>}
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{result.page} / {lastPage}</span>
                                {result.page < lastPage && <Link href={pageHref(result.page + 1)} className="btn btn-outline">{t('professionals.next')}</Link>}
                            </nav>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
