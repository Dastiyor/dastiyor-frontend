import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, XCircle, Eye, User, Calendar } from 'lucide-react';

export default async function AdminModerationPage() {
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

    if (!user || user.role !== 'ADMIN') {
        redirect('/access-denied');
    }

    // Get tasks pending moderation (newly created tasks)
    const pendingTasks = await prisma.task.findMany({
        where: {
            status: 'OPEN',
            createdAt: {
                // eslint-disable-next-line react-hooks/purity
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
            user: {
                select: { fullName: true, email: true }
            },
            _count: {
                select: { responses: true }
            }
        }
    });

    // Get reported reviews (if we had a report system, for now show recent reviews)
    const recentReviews = await prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
            reviewer: {
                select: { fullName: true, email: true }
            },
            reviewed: {
                select: { fullName: true }
            },
            task: {
                select: { title: true, id: true }
            }
        }
    });

    // Get users flagged for moderation (users with many rejected responses or complaints)
    const flaggedUsers = await prisma.user.findMany({
        where: {
            role: { in: ['CUSTOMER', 'PROVIDER'] }
        },
        include: {
            _count: {
                select: {
                    tasks: true,
                    responses: true
                }
            },
            responses: {
                where: {
                    status: 'REJECTED'
                },
                take: 5
            }
        },
        take: 10
    });

    const flaggedUsersList = flaggedUsers
        .filter(u => u._count.responses > 0 && u.responses.length > 0)
        .map(u => ({
            ...u,
            rejectionRate: (u.responses.length / u._count.responses) * 100
        }))
        .filter(u => u.rejectionRate > 50) // More than 50% rejection rate
        .slice(0, 5);

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container" style={{ maxWidth: '1400px' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 className="heading-lg">Модерация контента</h1>
                    <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>
                        Управление контентом, задачами и пользователями
                    </p>
                </div>

                {/* Stats */}
                <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px', color: '#F59E0B' }}>{pendingTasks.length}</div>
                        <div style={{ color: 'var(--text-light)' }}>Новых заданий (24ч)</div>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px', color: '#EF4444' }}>{flaggedUsersList.length}</div>
                        <div style={{ color: 'var(--text-light)' }}>Проблемных пользователей</div>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px', color: '#6366F1' }}>{recentReviews.length}</div>
                        <div style={{ color: 'var(--text-light)' }}>Последние отзывы</div>
                    </div>
                </div>

                {/* Pending Tasks */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', marginBottom: '32px' }}>
                    <h2 className="heading-md" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={24} color="#F59E0B" />
                        Новые задания для проверки
                    </h2>
                    {pendingTasks.length === 0 ? (
                        <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '40px' }}>
                            Нет новых заданий для модерации
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {pendingTasks.map((task) => (
                                <div
                                    key={task.id}
                                    style={{
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: '#FEF3C7',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'start',
                                        gap: '16px'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <Link
                                                href={`/tasks/${task.id}`}
                                                style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--primary)', textDecoration: 'none' }}
                                            >
                                                {task.title}
                                            </Link>
                                        </div>
                                        <p style={{ color: 'var(--text)', marginBottom: '12px', fontSize: '0.95rem' }}>
                                            {task.description.substring(0, 150)}...
                                        </p>
                                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <User size={14} />
                                                {task.user.fullName}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Calendar size={14} />
                                                {new Date(task.createdAt).toLocaleDateString('ru-RU')}
                                            </div>
                                            <div>💬 {task._count.responses} откликов</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <Link
                                            href={`/tasks/${task.id}`}
                                            className="btn btn-outline"
                                            style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                                        >
                                            <Eye size={16} style={{ marginRight: '4px' }} />
                                            Просмотр
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Flagged Users */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', marginBottom: '32px' }}>
                    <h2 className="heading-md" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={24} color="#EF4444" />
                        Проблемные пользователи
                    </h2>
                    {flaggedUsersList.length === 0 ? (
                        <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '40px' }}>
                            Нет пользователей, требующих внимания
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {flaggedUsersList.map((user) => (
                                <div
                                    key={user.id}
                                    style={{
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: '1px solid #FEE2E2',
                                        backgroundColor: '#FEF2F2',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '16px'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '8px' }}>
                                            {user.fullName} ({user.email})
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                            <div>Роль: {user.role === 'PROVIDER' ? 'Исполнитель' : 'Заказчик'}</div>
                                            <div>Отклонено откликов: {user.responses.length}</div>
                                            <div style={{ color: '#EF4444', fontWeight: '600' }}>
                                                Процент отклонений: {user.rejectionRate.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <Link
                                            href={`/admin/users?userId=${user.id}`}
                                            className="btn btn-outline"
                                            style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                                        >
                                            Просмотр
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Reviews */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px' }}>
                    <h2 className="heading-md" style={{ marginBottom: '24px' }}>Последние отзывы</h2>
                    {recentReviews.length === 0 ? (
                        <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '40px' }}>
                            Нет отзывов
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {recentReviews.map((review) => (
                                <div
                                    key={review.id}
                                    style={{
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'start',
                                        gap: '16px'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '1.5rem' }}>
                                                {'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                                            </div>
                                            <span style={{ fontWeight: '600' }}>
                                                {review.reviewer.fullName} → {review.reviewed.fullName}
                                            </span>
                                        </div>
                                        {review.comment && (
                                            <p style={{ color: 'var(--text)', marginBottom: '8px', lineHeight: '1.6' }}>
                                                {review.comment}
                                            </p>
                                        )}
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                            Задание: <Link href={`/tasks/${review.task.id}`} style={{ color: 'var(--primary)' }}>{review.task.title}</Link>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/reviews/${review.taskId}`}
                                        className="btn btn-outline"
                                        style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                                    >
                                        Просмотр
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            <style>{`
                @media (max-width: 640px) { .admin-stats-grid { grid-template-columns: 1fr !important; } }
            `}</style>
            </div>
        </div>
    );
}
