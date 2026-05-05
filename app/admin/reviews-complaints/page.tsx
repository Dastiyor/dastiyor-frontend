import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Star, AlertTriangle, Trash2, Eye, User, MessageSquare } from 'lucide-react';

export default async function ReviewsComplaintsPage() {
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

    // Get all reviews with low ratings (potential complaints)
    const allReviews = await prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            reviewer: {
                select: { fullName: true, email: true, id: true }
            },
            reviewed: {
                select: { fullName: true, id: true }
            },
            task: {
                select: { title: true, id: true, category: true }
            }
        }
    });

    // Filter low-rated reviews (potential complaints)
    const lowRatedReviews = allReviews.filter(r => r.rating <= 2);
    const highRatedReviews = allReviews.filter(r => r.rating >= 4);

    // Calculate statistics
    const stats = {
        total: allReviews.length,
        lowRated: lowRatedReviews.length,
        highRated: highRatedReviews.length,
        averageRating: allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
            : 0
    };

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container" style={{ maxWidth: '1400px' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 className="heading-lg">Отзывы и жалобы</h1>
                    <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>
                        Управление отзывами и обработка жалоб
                    </p>
                </div>

                {/* Stats */}
                <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>{stats.total}</div>
                        <div style={{ color: 'var(--text-light)' }}>Всего отзывов</div>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px', color: '#EF4444' }}>{stats.lowRated}</div>
                        <div style={{ color: 'var(--text-light)' }}>Низкие оценки (≤2)</div>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px', color: '#10B981' }}>{stats.highRated}</div>
                        <div style={{ color: 'var(--text-light)' }}>Высокие оценки (≥4)</div>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px', color: '#F59E0B' }}>
                            {stats.averageRating.toFixed(1)}
                        </div>
                        <div style={{ color: 'var(--text-light)' }}>Средний рейтинг</div>
                    </div>
                </div>

                {/* Low-Rated Reviews (Potential Complaints) */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', marginBottom: '32px' }}>
                    <h2 className="heading-md" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={24} color="#EF4444" />
                        Низкие оценки (требуют внимания)
                    </h2>
                    {lowRatedReviews.length === 0 ? (
                        <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '40px' }}>
                            Нет отзывов с низкими оценками
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {lowRatedReviews.map((review) => (
                                <div
                                    key={review.id}
                                    style={{
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: '1px solid #FEE2E2',
                                        backgroundColor: '#FEF2F2',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'start',
                                        gap: '16px'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{ fontSize: '1.5rem' }}>
                                                {'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                                            </div>
                                            <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                                                {review.reviewer.fullName}
                                            </span>
                                            <span style={{ color: 'var(--text-light)' }}>→</span>
                                            <span style={{ fontWeight: '600' }}>
                                                {review.reviewed.fullName}
                                            </span>
                                        </div>
                                        {review.comment && (
                                            <div style={{
                                                padding: '12px',
                                                backgroundColor: 'white',
                                                borderRadius: '8px',
                                                marginBottom: '12px',
                                                border: '1px solid #FECACA'
                                            }}>
                                                <p style={{ color: 'var(--text)', lineHeight: '1.6', margin: 0 }}>
                                                    {review.comment}
                                                </p>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <User size={14} />
                                                Заказчик: {review.reviewer.email}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <MessageSquare size={14} />
                                                Задание: <Link href={`/tasks/${review.task.id}`} style={{ color: 'var(--primary)' }}>{review.task.title}</Link>
                                            </div>
                                            <div>
                                                📅 {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                        <Link
                                            href={`/reviews/${review.taskId}`}
                                            className="btn btn-outline"
                                            style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                                        >
                                            <Eye size={16} style={{ marginRight: '4px' }} />
                                            Просмотр
                                        </Link>
                                        <Link
                                            href={`/admin/users?userId=${review.reviewerId}`}
                                            className="btn btn-outline"
                                            style={{ fontSize: '0.9rem', padding: '8px 16px', borderColor: '#EF4444', color: '#EF4444' }}
                                        >
                                            Пользователь
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* All Reviews */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px' }}>
                    <h2 className="heading-md" style={{ marginBottom: '24px' }}>Все отзывы</h2>
                    {allReviews.length === 0 ? (
                        <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '40px' }}>
                            Нет отзывов
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {allReviews.map((review) => {
                                const isLowRated = review.rating <= 2;
                                return (
                                    <div
                                        key={review.id}
                                        style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: `1px solid ${isLowRated ? '#FEE2E2' : 'var(--border)'}`,
                                            backgroundColor: isLowRated ? '#FEF2F2' : 'white',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'start',
                                            gap: '16px'
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                <div style={{ fontSize: '1.2rem' }}>
                                                    {'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                                                </div>
                                                <span style={{ fontWeight: '600' }}>
                                                    {review.reviewer.fullName} → {review.reviewed.fullName}
                                                </span>
                                            </div>
                                            {review.comment && (
                                                <p style={{ color: 'var(--text)', marginBottom: '8px', lineHeight: '1.6', fontSize: '0.95rem' }}>
                                                    {review.comment}
                                                </p>
                                            )}
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                                Задание: <Link href={`/tasks/${review.task.id}`} style={{ color: 'var(--primary)' }}>{review.task.title}</Link>
                                                {' • '}
                                                {new Date(review.createdAt).toLocaleDateString('ru-RU')}
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
                                );
                            })}
                        </div>
                    )}
                <style>{`
                    @media (max-width: 768px) { .admin-stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
                    @media (max-width: 480px) { .admin-stats-grid { grid-template-columns: 1fr !important; } }
                `}</style>
                </div>
            </div>
        </div>
    );
}
