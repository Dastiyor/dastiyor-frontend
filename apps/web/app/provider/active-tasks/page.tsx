import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Clock, MapPin, DollarSign, User, MessageSquare, Briefcase } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function ActiveTasksPage() {
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

    const activeTasks = await prisma.task.findMany({
        where: {
            assignedUserId: user.id,
            status: 'IN_PROGRESS'
        },
        orderBy: { updatedAt: 'desc' },
        include: {
            user: {
                select: { fullName: true, avatar: true, phone: true }
            },
            _count: {
                select: { responses: true, messages: true }
            }
        }
    });

    const { t } = await getServerTranslation();
    const accentColor = 'var(--primary)';
    const accentColorLight = '#DBEAFE';

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                    {t('provider.activeTasksTitle')}
                </h1>
                <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                    {t('provider.activeTasksDesc')}
                </p>
            </div>

            {/* Stats */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: accentColorLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Briefcase size={22} color={accentColor} />
                </div>
                <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B' }}>{activeTasks.length}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{t('provider.activeTasksCount')}</div>
                </div>
            </div>

            {/* Tasks List */}
            <div style={{ display: 'grid', gap: '16px' }}>
                {activeTasks.length === 0 ? (
                    <div style={{ backgroundColor: 'white', padding: '60px', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1E293B', marginBottom: '8px' }}>{t('provider.noActiveTasks')}</h3>
                        <p style={{ color: '#64748B', marginBottom: '20px', fontSize: '0.9rem' }}>
                            {t('provider.noActiveTasksDesc')}
                        </p>
                        <Link href="/provider/task-feed" style={{
                            display: 'inline-block',
                            padding: '10px 20px',
                            backgroundColor: accentColor,
                            color: 'white',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '0.9rem'
                        }}>
                            {t('provider.findTasks')}
                        </Link>
                    </div>
                ) : (
                    activeTasks.map((task) => (
                        <div
                            key={task.id}
                            style={{
                                backgroundColor: 'white',
                                padding: '20px',
                                borderRadius: '16px',
                                border: '1px solid #E2E8F0'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                        <Link
                                            href={`/provider/tasks/${task.id}`}
                                            style={{ fontSize: '1rem', fontWeight: '600', color: '#1E293B', textDecoration: 'none' }}
                                        >
                                            {task.title}
                                        </Link>
                                        <span style={{
                                            backgroundColor: accentColorLight,
                                            color: accentColor,
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                        }}>
                                            {t('provider.inProgress')}
                                        </span>
                                    </div>

                                    <p style={{ color: '#475569', marginBottom: '12px', lineHeight: '1.5', fontSize: '0.9rem' }}>
                                        {task.description.substring(0, 150)}{task.description.length > 150 ? '...' : ''}
                                    </p>

                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748B' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <DollarSign size={14} />
                                            <span style={{ fontWeight: '600', color: accentColor }}>
                                                {task.budgetType === 'fixed' ? `${task.budgetAmount} TJS` : t('common.negotiable')}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={14} />
                                            <span>{task.city}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <User size={14} />
                                            <span>{task.user.fullName}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={14} />
                                            <span>{t('provider.started')} {new Date(task.updatedAt).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <Link
                                        href={`/provider/tasks/${task.id}`}
                                        style={{
                                            padding: '8px 14px',
                                            backgroundColor: accentColor,
                                            color: 'white',
                                            borderRadius: '6px',
                                            textDecoration: 'none',
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
                                            textAlign: 'center'
                                        }}
                                    >
                                        {t('provider.openTask')}
                                    </Link>
                                    <Link
                                        href={`/provider/messages?userId=${task.userId}&taskId=${task.id}`}
                                        style={{
                                            padding: '8px 14px',
                                            backgroundColor: 'white',
                                            color: '#475569',
                                            borderRadius: '6px',
                                            textDecoration: 'none',
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
                                            border: '1px solid #E2E8F0',
                                            textAlign: 'center',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <MessageSquare size={14} />
                                        {t('provider.chat')} ({task._count.messages})
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}
