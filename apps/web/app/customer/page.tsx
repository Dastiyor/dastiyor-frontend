import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { PlusCircle, Clock, CheckCircle, MessageSquare } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function CustomerDashboardPage() {
    const { t } = await getServerTranslation();
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    // Token verification handled in layout mostly, but safe to grab ID here
    const payload = await verifyJWT(token!);
    const userId = payload?.id as string;

    const [activeTasks, completedTasks, unreadMessages] = await Promise.all([
        prisma.task.count({
            where: { userId, status: { in: ['OPEN', 'IN_PROGRESS'] } }
        }),
        prisma.task.count({
            where: { userId, status: 'COMPLETED' }
        }),
        prisma.message.count({
            where: { receiverId: userId, isRead: false }
        })
    ]);

    const recentTasks = await prisma.task.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
            _count: {
                select: { responses: true }
            }
        }
    });

    const accentColor = 'var(--primary)';

    const statusLabel: Record<string, string> = {
        OPEN: t('tasks.open'),
        IN_PROGRESS: t('tasks.inProgress'),
        COMPLETED: t('tasks.completed'),
        CANCELLED: t('tasks.cancelled'),
    };

    return (
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', marginBottom: '24px' }}>
                {t('customer.dashboard')}
            </h1>

            {/* Stats Cards */}
            <div className="dash-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={24} color={accentColor} />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B' }}>{activeTasks}</div>
                        <div style={{ color: '#64748B', fontSize: '0.9rem' }}>{t('customer.activeTasks')}</div>
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={24} color="#10B981" />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B' }}>{completedTasks}</div>
                        <div style={{ color: '#64748B', fontSize: '0.9rem' }}>{t('customer.completedTasks')}</div>
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageSquare size={24} color="#EF4444" />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B' }}>{unreadMessages}</div>
                        <div style={{ color: '#64748B', fontSize: '0.9rem' }}>{t('customer.unreadMessages')}</div>
                    </div>
                </div>
            </div>

            {/* Quick Action */}
            <Link href="/customer/create-task" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                padding: '16px',
                backgroundColor: 'white',
                border: '2px dashed #CBD5E1',
                borderRadius: '16px',
                marginBottom: '32px',
                color: '#64748B',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'all 0.2s'
            }}>
                <PlusCircle size={24} color={accentColor} />
                <span style={{ color: accentColor }}>{t('customer.createNewTask')}</span>
            </Link>

            {/* Recent tasks */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1E293B' }}>{t('customer.recentTasks')}</h2>
                    <Link href="/customer/my-tasks" style={{ color: accentColor, textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>{t('customer.viewAll')}</Link>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                                <th style={{ padding: '12px 0', fontSize: '0.85rem', color: '#64748B', fontWeight: '600' }}>{t('customer.colTitle')}</th>
                                <th style={{ padding: '12px 0', fontSize: '0.85rem', color: '#64748B', fontWeight: '600' }}>{t('customer.colStatus')}</th>
                                <th style={{ padding: '12px 0', fontSize: '0.85rem', color: '#64748B', fontWeight: '600' }}>{t('customer.colDate')}</th>
                                <th style={{ padding: '12px 0', fontSize: '0.85rem', color: '#64748B', fontWeight: '600' }}>{t('customer.colResponses')}</th>
                                <th style={{ padding: '12px 0', fontSize: '0.85rem', color: '#64748B', fontWeight: '600' }}>{t('customer.colAction')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '32px 0', textAlign: 'center', color: '#94A3B8' }}>
                                        {t('customer.noTasksFoundCta')}
                                    </td>
                                </tr>
                            ) : (
                                recentTasks.map((task) => (
                                    <tr key={task.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                        <td style={{ padding: '14px 0', fontWeight: '600', color: '#1E293B' }}>
                                            {task.title}
                                        </td>
                                        <td style={{ padding: '14px 0' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                backgroundColor: task.status === 'OPEN' ? '#DBEAFE' : task.status === 'IN_PROGRESS' ? '#FEF3C7' : '#D1FAE5',
                                                color: task.status === 'OPEN' ? '#1D4ED8' : task.status === 'IN_PROGRESS' ? '#D97706' : '#059669'
                                            }}>
                                                {statusLabel[task.status] || task.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 0', color: '#64748B', fontSize: '0.9rem' }}>
                                            {new Date(task.createdAt).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '14px 0', color: '#64748B', fontSize: '0.9rem' }}>
                                            {t('customer.offersCount', { count: task._count.responses })}
                                        </td>
                                        <td style={{ padding: '14px 0' }}>
                                            <Link href={`/customer/tasks/${task.id}`} style={{
                                                padding: '6px 12px',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '6px',
                                                textDecoration: 'none',
                                                color: '#475569',
                                                fontSize: '0.8rem',
                                                fontWeight: '600'
                                            }}>
                                                {t('customer.manage')}
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <style>{`
                @media (max-width: 640px) {
                    .dash-stats-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                }
                @media (max-width: 900px) and (min-width: 641px) {
                    .dash-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
            `}</style>
        </div>
    );
}
