'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import TaskCard, { type Task } from '@/components/tasks/TaskCard';

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

export default function TasksFeed() {
    const searchParams = useSearchParams();
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
            if (!res.ok) throw new Error(data.error || 'Failed to load');
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
                <div style={{ fontSize: '1.5rem' }}>Загрузка...</div>
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
                <h3 className="heading-md" style={{ marginBottom: '8px' }}>Ошибка загрузки</h3>
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
                    Повторить
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
                    <h3 className="heading-md" style={{ marginBottom: '8px' }}>Заданий пока нет</h3>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>
                        В этой категории ещё нет заданий. Попробуйте другой фильтр или загляните позже.
                    </p>
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
                        {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
                    </button>
                </div>
            )}
        </>
    );
}
