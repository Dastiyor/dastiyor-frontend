'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TaskCard, { type Task } from '@/components/tasks/TaskCard';
import { useTranslation } from '@/lib/i18n';

const PAGE_SIZE = 6;

function buildQueryString(searchParams: URLSearchParams, pageNum: number): string {
    const params = new URLSearchParams();
    params.set('page', String(pageNum));
    params.set('limit', String(PAGE_SIZE));
    const category = searchParams.get('category');
    const query = searchParams.get('query');
    const city = searchParams.get('city');
    const minBudget = searchParams.get('minBudget');
    const maxBudget = searchParams.get('maxBudget');
    const urgency = searchParams.get('urgency');
    const sort = searchParams.get('sort') || 'newest';
    if (category) params.set('category', category);
    if (query) params.set('query', query);
    if (city) params.set('city', city);
    if (minBudget) params.set('minBudget', minBudget);
    if (maxBudget) params.set('maxBudget', maxBudget);
    if (urgency) params.set('urgency', urgency);
    if (sort) params.set('sort', sort);
    return params.toString();
}

export default function TasksFeed({ viewerRole = null, providerHasTaskAlerts = false }: {
    viewerRole?: 'CUSTOMER' | 'PROVIDER' | null;
    /** The provider's plan includes new-task alerts (PRO and up). */
    providerHasTaskAlerts?: boolean;
}) {
    const searchParams = useSearchParams();
    const { t, tError } = useTranslation();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fetchPage = async (pageNum: number, append: boolean, signal: AbortSignal) => {
        try {
            const qs = buildQueryString(searchParams, pageNum);
            const res = await fetch(`/api/tasks?${qs}`, { signal });
            const data = await res.json();
            if (!res.ok) throw new Error(tError(data.error) || t('common.somethingWentWrong'));
            const list: Task[] = data.tasks || [];
            const pagination = data.pagination || {};
            setTasks(prev => {
                const merged = append ? [...prev, ...list] : list;
                const seen = new Set<string>();
                return merged.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
            });
            setHasMore(!!pagination.hasMore);
            setPage(pageNum);
            setFetchError(null);
        } catch (err) {
            if ((err as Error).name === 'AbortError') return;
            setFetchError(err instanceof Error ? err.message : 'Failed to load tasks');
            setHasMore(false);
            if (pageNum === 1) setTasks([]);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        setLoading(true);
        setFetchError(null);
        fetchPage(1, false, abortRef.current.signal);
        return () => abortRef.current?.abort();
    }, [searchParams.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleLoadMore = () => {
        if (loadingMore || !hasMore) return;
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        setLoadingMore(true);
        fetchPage(page + 1, true, abortRef.current.signal);
    };

    if (loading) {
        return (
            <div style={{
                display: 'grid',
                gap: '16px',
                padding: '24px 0',
                justifyContent: 'center',
                textAlign: 'center',
                color: 'var(--text-light)',
            }}>
                <div style={{ fontSize: '1.5rem' }}>{t('common.loading')}</div>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '80px 40px',
                backgroundColor: 'white',
                borderRadius: '16px',
                border: '1px solid var(--border)',
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>⚠️</div>
                <h3 className="heading-md" style={{ marginBottom: '8px' }}>{t('tasks.errLoadTitle')}</h3>
                <p style={{ color: 'var(--text-light)', maxWidth: '400px', margin: '0 auto 16px' }}>
                    {fetchError}
                </p>
                <button type="button" className="btn btn-outline" onClick={() => {
                    abortRef.current?.abort();
                    abortRef.current = new AbortController();
                    setLoading(true);
                    setFetchError(null);
                    fetchPage(1, false, abortRef.current.signal);
                }}>
                    {t('tasks.retry')}
                </button>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <>
                <div style={{
                    textAlign: 'center',
                    padding: '48px 24px',
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    marginBottom: '24px',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
                    <h3 className="heading-md" style={{ marginBottom: '8px' }}>{t('tasks.noTasksTitle')}</h3>
                    <EmptyFeedAction viewerRole={viewerRole} providerHasTaskAlerts={providerHasTaskAlerts} category={searchParams.get('category')} />
                </div>
            </>
        );
    }

    return (
        <>
            <div style={{ display: 'grid', gap: '16px' }}>
                {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                ))}
            </div>
            {hasMore && (
                <div style={{ textAlign: 'center', marginTop: '32px' }}>
                    <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="btn btn-outline"
                        style={{ minWidth: '160px' }}
                    >
                        {loadingMore ? t('common.loading') : t('tasks.loadMore')}
                    </button>
                </div>
            )}
        </>
    );
}

const emptyText: React.CSSProperties = { color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '20px' };

/**
 * An empty feed offers the next step instead of a dead end: a customer is
 * asked to post the first task (in the category they were looking at); a
 * provider on PRO or above to switch on new-task alerts. A FREE provider gets
 * no alerts, so they are sent to the whole feed instead and told, in a plain
 * line, which plans have alerts. Anyone who is not a customer is also told the
 * site is for one-off tasks, since job seekers land here looking for
 * permanent work.
 */
function EmptyFeedAction({ viewerRole, providerHasTaskAlerts, category }: {
    viewerRole: 'CUSTOMER' | 'PROVIDER' | null;
    providerHasTaskAlerts: boolean;
    category: string | null;
}) {
    const { t } = useTranslation();
    const createHref = category ? `/create-task?category=${encodeURIComponent(category)}` : '/create-task';
    const oneOffHint = (
        <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginTop: '20px', marginBottom: 0 }}>
            {t('tasks.oneOffHint')}
        </p>
    );

    if (viewerRole === 'PROVIDER' && !providerHasTaskAlerts) {
        return (
            <>
                {/* Already on the unfiltered feed: there is nowhere wider to send them. */}
                {category && (
                    <Link href="/tasks" className="btn btn-primary">{t('tasks.emptySeeAllTasks')}</Link>
                )}
                <p style={{ ...emptyText, marginTop: category ? '16px' : 0, marginBottom: 0 }}>
                    {t('tasks.alertsPaidOnly')}
                </p>
                {oneOffHint}
            </>
        );
    }
    if (viewerRole === 'PROVIDER') {
        return (
            <>
                <p style={emptyText}>{t('tasks.emptyProviderDesc')}</p>
                <Link href="/provider/profile#task-alerts" className="btn btn-primary">{t('tasks.emptyGetNotified')}</Link>
                {oneOffHint}
            </>
        );
    }
    return (
        <>
            <p style={emptyText}>{t('tasks.emptyCustomerDesc')}</p>
            <Link href={createHref} className="btn btn-primary">{t('tasks.emptyCreateFirst')}</Link>
            {viewerRole === null && (
                <>
                    <p style={{ ...emptyText, marginTop: '16px', marginBottom: 0 }}>
                        <Link href="/register?type=provider" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            {t('tasks.emptyGuestProvider')}
                        </Link>
                    </p>
                    {oneOffHint}
                </>
            )}
        </>
    );
}
