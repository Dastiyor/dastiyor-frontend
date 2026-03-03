'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import TaskCard, { type Task } from '@/components/tasks/TaskCard';

const PAGE_SIZE = 20;

export default function TasksFeed() {
    const searchParams = useSearchParams();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const buildQuery = useCallback((pageNum: number) => {
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
    }, [searchParams]);

    const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
        const isFirst = pageNum === 1;
        if (isFirst) setLoading(true);
        else setLoadingMore(true);
        try {
            const res = await fetch(`/api/tasks?${buildQuery(pageNum)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load');
            const list = data.tasks || [];
            const pagination = data.pagination || {};
            if (append) {
                setTasks(prev => [...prev, ...list]);
            } else {
                setTasks(list);
            }
            setTotal(pagination.total ?? 0);
            setHasMore(!!pagination.hasMore);
            setPage(pageNum);
        } catch (err) {
            setHasMore(false);
            if (pageNum === 1) setTasks([]);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [buildQuery]);

    useEffect(() => {
        fetchPage(1, false);
    }, [fetchPage]);

    const handleLoadMore = () => {
        if (loadingMore || !hasMore) return;
        fetchPage(page + 1, true);
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

    if (tasks.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '80px 40px',
                backgroundColor: 'white',
                borderRadius: '16px',
                border: '1px solid var(--border)',
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔍</div>
                <h3 className="heading-md" style={{ marginBottom: '8px' }}>Задания не найдены</h3>
                <p style={{ color: 'var(--text-light)', maxWidth: '400px', margin: '0 auto' }}>
                    Попробуйте изменить фильтры или расширить критерии поиска.
                </p>
            </div>
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
