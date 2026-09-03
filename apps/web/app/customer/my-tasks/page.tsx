import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function CustomerMyTasksPage() {
    const { t } = await getServerTranslation();
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        redirect('/login');
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
        redirect('/login');
    }

    const tasks = await prisma.task.findMany({
        where: {
            userId: payload.id as string
        },
        orderBy: {
            createdAt: 'desc'
        },
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B' }}>{t('customer.myTasks')}</h1>
                <Link href="/customer/create-task" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: accentColor,
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                }}>
                    <PlusCircle size={18} />
                    {t('customer.createNewTask')}
                </Link>
            </div>

            {tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', color: '#1E293B' }}>{t('customer.noTasks')}</h3>
                    <p style={{ color: '#64748B', marginBottom: '32px' }}>{t('customer.createFirstTaskDesc')}</p>
                    <Link href="/customer/create-task" style={{
                        display: 'inline-block',
                        backgroundColor: accentColor,
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        textDecoration: 'none'
                    }}>{t('customer.createTask')}</Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {tasks.map((task) => (
                        <div key={task.id} style={{
                            backgroundColor: 'white',
                            padding: '24px',
                            borderRadius: '16px',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '20px',
                            transition: 'all 0.2s ease'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', alignItems: 'center' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        backgroundColor: task.status === 'OPEN' ? '#DBEAFE' : task.status === 'IN_PROGRESS' ? '#FEF3C7' : task.status === 'CANCELLED' ? '#FEE2E2' : '#D1FAE5',
                                        color: task.status === 'OPEN' ? '#1D4ED8' : task.status === 'IN_PROGRESS' ? '#D97706' : task.status === 'CANCELLED' ? '#DC2626' : '#059669'
                                    }}>
                                        {statusLabel[task.status] || task.status}
                                    </span>
                                    <span style={{ color: '#64748B', fontSize: '0.85rem' }}>
                                        {new Date(task.createdAt).toLocaleDateString('ru-RU')}
                                    </span>
                                </div>
                                <Link href={`/customer/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
                                    <h3 style={{ marginBottom: '8px', cursor: 'pointer', color: '#1E293B', fontSize: '1.1rem', fontWeight: '700' }}>
                                        {task.title}
                                    </h3>
                                </Link>
                                <div style={{ color: '#64748B', fontSize: '0.9rem' }}>
                                    {task.budgetType === 'fixed' ? `${task.budgetAmount} ${t('common.somali')}` : t('common.negotiable')} • {t('customer.offersCount', { count: task._count.responses })}
                                </div>
                            </div>

                            <Link href={`/customer/tasks/${task.id}`} style={{
                                padding: '10px 20px',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                color: '#475569',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                backgroundColor: 'white'
                            }}>
                                {t('customer.manage')}
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
