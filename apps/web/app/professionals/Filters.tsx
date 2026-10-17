'use client';

import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAdoptTypedValue } from '@/lib/useHydrated';
import styles from './professionals.module.css';

const SORTS = ['rating', 'reviews', 'completed', 'newest'] as const;

/**
 * Search box, category/city filters and sort for /professionals. Writes canonical values to the URL.
 * ponytail: a GET form on purpose (unlike login-style forms, which are POST): before hydration a
 * native submit is a working search, and nothing here is secret.
 */
export default function Filters({ categories, cities }: { categories: string[]; cities: string[] }) {
    const { t, tr } = useTranslation();
    const router = useRouter();
    const params = useSearchParams();
    const [q, setQ] = useState(params.get('q') ?? '');
    const qRef = useRef<HTMLInputElement>(null);
    useAdoptTypedValue(qRef, setQ);

    const apply = (key: string, value: string) => {
        const next = new URLSearchParams(params.toString());
        if (value) next.set(key, value); else next.delete(key);
        next.delete('page'); // a new filter starts from the first page
        const qs = next.toString();
        router.replace(qs ? `/professionals?${qs}` : '/professionals');
    };

    return (
        <form className={styles.filters} role="search" method="get" action="/professionals"
            onSubmit={(e) => { e.preventDefault(); apply('q', q.trim()); }}>
            <div className={styles.search}>
                <div className={styles.field} style={{ flex: 1 }}>
                    <label htmlFor="pro-q" className={styles.label}>{t('professionals.searchLabel')}</label>
                    <input id="pro-q" ref={qRef} name="q" className={styles.input} type="search" value={q} maxLength={100}
                        placeholder={t('professionals.searchPlaceholder')} onChange={(e) => setQ(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'end' }}>{t('professionals.searchBtn')}</button>
            </div>

            <div className={styles.field}>
                <label htmlFor="pro-category" className={styles.label}>{t('professionals.category')}</label>
                <select id="pro-category" name="category" className={styles.input} value={params.get('category') ?? ''} onChange={(e) => apply('category', e.target.value)}>
                    <option value="">{t('professionals.allCategories')}</option>
                    {categories.map(c => <option key={c} value={c}>{tr(c)}</option>)}
                </select>
            </div>

            <div className={styles.field}>
                <label htmlFor="pro-city" className={styles.label}>{t('professionals.city')}</label>
                <select id="pro-city" name="city" className={styles.input} value={params.get('city') ?? ''} onChange={(e) => apply('city', e.target.value)}>
                    <option value="">{t('professionals.allCities')}</option>
                    {cities.map(c => <option key={c} value={c}>{tr(c)}</option>)}
                </select>
            </div>

            <div className={styles.field}>
                <label htmlFor="pro-sort" className={styles.label}>{t('professionals.sortLabel')}</label>
                <select id="pro-sort" name="sort" className={styles.input} value={params.get('sort') ?? 'rating'} onChange={(e) => apply('sort', e.target.value === 'rating' ? '' : e.target.value)}>
                    {SORTS.map(s => <option key={s} value={s}>{t(`professionals.sort_${s}`)}</option>)}
                </select>
            </div>
        </form>
    );
}
