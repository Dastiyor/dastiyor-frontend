import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Clock, DollarSign, Users, Calendar, Filter, Search } from 'lucide-react';
import { Prisma } from '@prisma/client';
import { getServerTranslation } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function TaskFeedPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    // await searchParams in Next.js 15+ if needed, but for 14 it's prop. 
    // The user's package.json says next: "16.1.4".
    // In Next.js 15/16, searchParams is a Promise. We MUST await it.
    const params = await searchParams;

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

    // Parse filters
    const category = typeof params.category === 'string' ? params.category : undefined;
    const city = typeof params.city === 'string' ? params.city : undefined;
    const urgency = typeof params.urgency === 'string' ? params.urgency : undefined;
    const minBudget = typeof params.minBudget === 'string' ? parseFloat(params.minBudget) : undefined;
    const maxBudget = typeof params.maxBudget === 'string' ? parseFloat(params.maxBudget) : undefined;
    const q = typeof params.q === 'string' ? params.q.trim() : undefined;

    // Build Where Input
    const where: Prisma.TaskWhereInput = {
        status: 'OPEN',
        NOT: { userId: user.id },
    };

    if (category && category !== '') {
        where.category = category;
    }

    if (city && city !== '') {
        where.city = { contains: city, mode: 'insensitive' };
    }

    if (urgency && urgency !== '') {
        where.urgency = urgency;
    }

    if (q && q !== '') {
        where.OR = [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
        ];
    }

    // Get open tasks
    const tasks = await prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
            user: { select: { fullName: true, avatar: true } },
            _count: { select: { responses: true } }
        }
    });

    const { t } = await getServerTranslation();

    // Client-side budget filtering
    let filteredTasks = tasks;
    if (minBudget || maxBudget) {
        filteredTasks = tasks.filter(t => {
            if (t.budgetType !== 'fixed' || !t.budgetAmount) return false;
            const amt = parseFloat(t.budgetAmount);
            if (isNaN(amt)) return false;
            if (minBudget && amt < minBudget) return false;
            if (maxBudget && amt > maxBudget) return false;
            return true;
        });
    }

    return (
        <div style={{ paddingBottom: '40px' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#1E293B', marginBottom: '8px' }}>
                    {t('provider.taskFeedTitle')}
                </h1>
                <p style={{ color: '#64748B', fontSize: '1rem' }}>
                    {t('provider.taskFeedDesc')}
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '32px', alignItems: 'start' }}>

                {/* Main Content: Tasks List */}
                <div style={{ display: 'grid', gap: '16px' }}>
                    {filteredTasks.length === 0 ? (
                        <div style={{ backgroundColor: 'white', padding: '60px', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1E293B', marginBottom: '8px' }}>{t('provider.noTasksFound')}</h3>
                            <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                                {t('provider.tryFilters')}
                            </p>
                            <Link href="/provider/task-feed" style={{ display: 'inline-block', marginTop: '16px', color: '#3B82F6', fontWeight: '600' }}>
                                {t('filters.reset')}
                            </Link>
                        </div>
                    ) : (
                        filteredTasks.map((task) => (
                            <div
                                key={task.id}
                                style={{
                                    backgroundColor: 'white',
                                    padding: '24px',
                                    borderRadius: '16px',
                                    border: '1px solid #E2E8F0',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '20px' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                            <Link
                                                href={`/provider/tasks/${task.id}`}
                                                style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1E293B', textDecoration: 'none' }}
                                            >
                                                {task.title}
                                            </Link>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                backgroundColor: '#E0F2FE',
                                                color: '#0369A1',
                                                fontSize: '0.75rem',
                                                fontWeight: '600'
                                            }}>
                                                {task.category}
                                            </span>
                                            {task.urgency === 'urgent' && (
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    backgroundColor: '#FEF2F2',
                                                    color: '#DC2626',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {t('tasks.urgent')}
                                                </span>
                                            )}
                                        </div>

                                        <p style={{ color: '#475569', marginBottom: '16px', lineHeight: '1.6', fontSize: '0.9rem' }}>
                                            {task.description.length > 200 ? task.description.substring(0, 200) + '...' : task.description}
                                        </p>

                                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.85rem', color: '#64748B' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <DollarSign size={16} color="#16A34A" />
                                                <span style={{ fontWeight: '600', color: '#16A34A', fontSize: '1rem' }}>
                                                    {task.budgetType === 'fixed' ? `${task.budgetAmount} с.` : t('common.negotiable')}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <MapPin size={16} />
                                                <span>{task.city}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={16} />
                                                <span>{new Date(task.createdAt).toLocaleDateString('ru-RU', { month: 'long', day: 'numeric' })}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Users size={16} />
                                                <span>{t('tasks.responseCountLabel', { count: task._count.responses })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Link
                                        href={`/provider/tasks/${task.id}`}
                                        style={{
                                            padding: '12px 24px',
                                            backgroundColor: '#3B82F6',
                                            color: 'white',
                                            borderRadius: '8px',
                                            textDecoration: 'none',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            whiteSpace: 'nowrap',
                                            alignSelf: 'center'
                                        }}
                                    >
                                        {t('provider.openTask')}
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Filters Sidebar */}
                <div style={{ position: 'sticky', top: '20px' }}>
                    <form style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <Filter size={20} color="#3B82F6" />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1E293B', margin: 0 }}>{t('filters.title')}</h3>
                        </div>

                        {/* Search */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>{t('filters.searchTasks')}</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                <input
                                    type="text"
                                    name="q"
                                    defaultValue={typeof params.q === 'string' ? params.q : ''}
                                    placeholder={t('filters.searchPlaceholder')}
                                    style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>{t('filters.allCategories')}</label>
                            <select
                                name="category"
                                defaultValue={category}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', backgroundColor: 'white' }}
                            >
                                <option value="">{t('filters.allCategories')}</option>
                                <option value="Home Repair">Домашний ремонт</option>
                                <option value="Cleaning">Уборка</option>
                                <option value="Delivery">Доставка</option>
                                <option value="Tech Support">IT и Техника</option>
                            </select>
                        </div>

                        {/* City */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>{t('filters.allCities')}</label>
                            <div style={{ position: 'relative' }}>
                                <MapPin size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94A3B8' }} />
                                <input
                                    type="text"
                                    name="city"
                                    defaultValue={city}
                                    placeholder={t('filters.cityPlaceholder')}
                                    style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                                />
                            </div>
                        </div>

                        {/* Urgency */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>{t('tasks.urgency')}</label>
                            <select
                                name="urgency"
                                defaultValue={urgency}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', backgroundColor: 'white' }}
                            >
                                <option value="">{t('filters.anyUrgency')}</option>
                                <option value="urgent">{t('filters.urgentLabel')}</option>
                                <option value="normal">{t('filters.normalLabel')}</option>
                                <option value="low">{t('filters.lowLabel')}</option>
                            </select>
                        </div>

                        {/* Budget */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>{t('filters.budgetTJS')}</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <input
                                    type="number"
                                    name="minBudget"
                                    defaultValue={minBudget}
                                    min="0"
                                    placeholder={t('filters.from')}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                                />
                                <input
                                    type="number"
                                    name="maxBudget"
                                    defaultValue={maxBudget}
                                    min="0"
                                    placeholder={t('filters.to')}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="submit"
                                style={{
                                    flex: 1,
                                    backgroundColor: '#3B82F6',
                                    color: 'white',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {t('filters.apply')}
                            </button>
                            <Link
                                href="/provider/task-feed"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#F1F5F9',
                                    color: '#64748B',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    width: '40px'
                                }}
                            >
                                ✕
                            </Link>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
