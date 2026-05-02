import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ReviewList from '@/components/reviews/ReviewList';
import Link from 'next/link';
import { getServerTranslation } from '@/lib/i18n/server';

type Props = {
    params: { id: string };
};

export default async function UserReviewsPage({ params }: Props) {
    const { id } = await params;

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            fullName: true,
            role: true,
            createdAt: true,
            _count: {
                select: {
                    assignedTasks: {
                        where: { status: 'COMPLETED' }
                    }
                }
            }
        }
    });

    if (!user) {
        notFound();
    }

    const { t } = await getServerTranslation();

    // Get reviews
    const reviews = await prisma.review.findMany({
        where: { reviewedId: id },
        orderBy: { createdAt: 'desc' },
        include: {
            reviewer: {
                select: { id: true, fullName: true }
            },
            task: {
                select: { id: true, title: true, category: true }
            }
        }
    });

    // Calculate stats
    const totalRating = reviews.reduce((sum: number, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    const breakdown = {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length,
    };

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '60px 0' }}>
            <div className="container" style={{ maxWidth: '900px' }}>
                {/* Profile Header */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    padding: '32px',
                    marginBottom: '32px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 'bold'
                    }}>
                        {user.fullName[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>{user.fullName}</h1>
                        <div style={{ display: 'flex', gap: '16px', color: 'var(--text-light)' }}>
                            <span>{user.role === 'PROVIDER' ? t('reviews_page.provider') : t('reviews_page.customer')}</span>
                            <span>•</span>
                            <span>{t('reviews_page.memberSince')} {new Date(user.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{user._count.assignedTasks} {t('reviews_page.tasksDone')}</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '700' }}>{averageRating.toFixed(1)}</div>
                        <div style={{ color: '#fbbf24' }}>{'★'.repeat(Math.round(averageRating))}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{reviews.length} {t('reviews_page.reviews')}</div>
                    </div>
                </div>

                <h2 className="heading-md" style={{ marginBottom: '24px' }}>{t('reviews_page.reviewsTitle')}</h2>

                <ReviewList
                    reviews={reviews}
                    stats={{
                        totalReviews: reviews.length,
                        averageRating,
                        breakdown
                    }}
                />

                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <Link href="/tasks" className="btn btn-outline">
                        {t('reviews_page.findTasks')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
