import { getServerTranslation } from '@/lib/i18n/server';

type Review = {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string | Date;
    reviewer: {
        id: string;
        fullName: string;
    };
    task: {
        id: string;
        title: string;
        category: string;
    };
};

type Props = {
    reviews: Review[];
    stats: {
        totalReviews: number;
        averageRating: number;
        breakdown: Record<number, number>;
    };
};

function getReviewPlural(count: number, t: (key: string) => string): string {
    if (count % 10 === 1 && count % 100 !== 11) {
        return t('reviews.review');
    }
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
        return t('reviews.reviewsFew');
    }
    return t('reviews.reviewsMany');
}

export default async function ReviewList({ reviews, stats }: Props) {
    const { t } = await getServerTranslation();
    const renderStars = (rating: number) => {
        return (
            <span style={{ color: '#fbbf24' }}>
                {'★'.repeat(rating)}
                <span style={{ color: '#d1d5db' }}>{'★'.repeat(5 - rating)}</span>
            </span>
        );
    };

    return (
        <div>
            {/* Stats Summary */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '32px',
                border: '1px solid var(--border)',
                marginBottom: '24px',
                display: 'flex',
                gap: '48px'
            }}>
                {/* Average Rating */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3.5rem', fontWeight: '700', color: 'var(--text)' }}>
                        {stats.averageRating.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
                        {renderStars(Math.round(stats.averageRating))}
                    </div>
                    <div style={{ color: 'var(--text-light)' }}>
                        {stats.totalReviews} {getReviewPlural(stats.totalReviews, t)}
                    </div>
                </div>

                {/* Breakdown */}
                <div style={{ flex: 1 }}>
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = stats.breakdown[star] || 0;
                        const percentage = stats.totalReviews > 0
                            ? (count / stats.totalReviews) * 100
                            : 0;

                        return (
                            <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <span style={{ width: '20px', textAlign: 'right', fontSize: '0.9rem' }}>{star}</span>
                                <span style={{ color: '#fbbf24' }}>★</span>
                                <div style={{
                                    flex: 1,
                                    height: '8px',
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${percentage}%`,
                                        height: '100%',
                                        backgroundColor: '#fbbf24',
                                        transition: 'width 0.3s'
                                    }} />
                                </div>
                                <span style={{
                                    width: '30px',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-light)'
                                }}>
                                    {count}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Reviews List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {reviews.length === 0 ? (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '48px',
                        textAlign: 'center',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⭐</div>
                        <p style={{ color: 'var(--text-light)' }}>{t('reviews.noReviews')}</p>
                    </div>
                ) : (
                    reviews.map((review) => (
                        <div
                            key={review.id}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '24px',
                                border: '1px solid var(--border)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--primary)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold'
                                    }}>
                                        {review.reviewer.fullName[0]}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>{review.reviewer.fullName}</div>
                                        <div style={{ fontSize: '1.1rem' }}>{renderStars(review.rating)}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                                    {new Date(review.createdAt).toLocaleDateString()}
                                </div>
                            </div>

                            {review.comment && (
                                <p style={{ color: 'var(--text)', lineHeight: '1.6', marginBottom: '12px' }}>
                                    {review.comment}
                                </p>
                            )}

                            <div style={{
                                fontSize: '0.85rem',
                                color: 'var(--text-light)',
                                padding: '8px 12px',
                                backgroundColor: '#f9fafb',
                                borderRadius: '8px',
                                display: 'inline-block'
                            }}>
                                📋 {review.task.title}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
