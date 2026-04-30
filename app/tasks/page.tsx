import { prisma } from '@/lib/prisma';
import TaskFilterSidebar from '@/components/tasks/TaskFilterSidebar';
import TaskSortSelect from '@/components/tasks/TaskSortSelect';
import TasksFeed from '@/components/tasks/TasksFeed';
import { Suspense } from 'react';
import Link from 'next/link';

type Props = {
    searchParams: {
        category?: string;
        query?: string;
        city?: string;
        minBudget?: string;
        maxBudget?: string;
        urgency?: string;
        sort?: string;
        dateFrom?: string;
        dateTo?: string;
        page?: string;
    }
}

export default async function TasksPage({ searchParams }: Props) {
    const params = await searchParams;
    const { category, city, minBudget, maxBudget, urgency, sort, query } = params;

    // Get category counts and total for sidebar (lightweight queries)
    const categoryCounts = await prisma.task.groupBy({
        by: ['category'],
        where: { status: 'OPEN' },
        _count: true
    });

    const totalOpenTasks = await prisma.task.count({ where: { status: 'OPEN' } });

    // Build filtered count matching the API query logic
    const hasFilter = category || city || minBudget || maxBudget || urgency || query;
    let filteredCount = totalOpenTasks;
    if (hasFilter) {
        const where: any = { status: 'OPEN' };
        if (category) where.category = category;
        if (city) where.city = { contains: city, mode: 'insensitive' };
        if (urgency) {
            const vals = urgency.split(',').filter(Boolean);
            if (vals.length) where.urgency = { in: vals };
        }
        if (query) {
            where.OR = [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
            ];
        }
        if (minBudget || maxBudget) {
            where.AND = where.AND || [];
            where.AND.push({
                OR: [
                    { budgetType: 'negotiable' },
                    {
                        budgetType: 'fixed',
                        budgetAmountNum: {
                            ...(minBudget ? { gte: parseInt(minBudget, 10) } : {}),
                            ...(maxBudget ? { lte: parseInt(maxBudget, 10) } : {}),
                        },
                    },
                ],
            });
        }
        filteredCount = await prisma.task.count({ where });
    }

    // Build active filters display
    const activeFilters: string[] = [];
    if (category) activeFilters.push(`Категория: ${category}`);
    if (city) activeFilters.push(`Город: ${city}`);
    if (minBudget) activeFilters.push(`От: ${minBudget} с.`);
    if (maxBudget) activeFilters.push(`До: ${maxBudget} с.`);
    if (urgency) activeFilters.push(`Срочность: ${urgency}`);

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container">
                {/* Find Work Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginBottom: '32px'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '2.5rem',
                            fontWeight: '800',
                            color: 'var(--text)',
                            marginBottom: '8px'
                        }}>Найти задания</h1>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--text-light)',
                            fontSize: '1rem',
                            fontWeight: '500'
                        }}>
                            <span style={{ color: 'var(--primary)' }}>⚡</span>
                            <span>{filteredCount.toLocaleString()} {hasFilter ? 'заданий по вашему запросу' : 'открытых заданий'}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <Link href="/contractor-plans" style={{
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            color: 'var(--primary)',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            textDecoration: 'none',
                            border: '1px solid rgba(37, 99, 235, 0.2)',
                            transition: 'background-color 0.2s'
                        }}>
                            <span style={{ fontSize: '1rem' }}>✓</span> PRO MEMBER
                        </Link>
                        <TaskSortSelect defaultValue={sort || 'newest'} />
                    </div>
                </div>

                {activeFilters.length > 0 && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '24px'
                    }}>
                        {activeFilters.map((filter, idx) => (
                            <span
                                key={idx}
                                style={{
                                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                    color: 'var(--primary)',
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                {filter}
                            </span>
                        ))}
                    </div>
                )}

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '280px 1fr',
                    gap: '32px',
                }}>
                    {/* Sidebar */}
                    <aside>
                        <Suspense fallback={<div>Loading filters...</div>}>
                            <TaskFilterSidebar
                                categoryCounts={categoryCounts}
                                totalOpenTasks={totalOpenTasks}
                            />
                        </Suspense>
                    </aside>

                    {/* Feed – lazy loaded via API */}
                    <main>
                        <Suspense fallback={
                            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-light)' }}>Загрузка...</div>
                        }>
                            <TasksFeed />
                        </Suspense>
                    </main>
                </div>
            </div>
        </div>
    );
}
