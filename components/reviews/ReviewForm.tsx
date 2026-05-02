'use client';

import { useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { useTranslation } from '@/lib/i18n';

type Props = {
    taskId: string;
    providerName: string;
    onReviewSubmitted?: () => void;
};

export default function ReviewForm({ taskId, providerName, onReviewSubmitted }: Props) {
    const { t } = useTranslation();
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast.warning(t('reviews.selectRating'));
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId, rating, comment })
            });

            if (res.ok) {
                setSubmitted(true);
                toast.success(t('reviews.submitSuccess'));
                onReviewSubmitted?.();
            } else {
                const data = await res.json();
                toast.error(data.error || t('reviews.genericError'));
            }
        } catch (error) {
            toast.error(t('reviews.genericError'));
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div style={{
                backgroundColor: '#f0fdf4',
                borderRadius: '16px',
                padding: '32px',
                textAlign: 'center',
                border: '1px solid #bbf7d0'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
                <h3 style={{ fontWeight: '600', color: '#166534', marginBottom: '8px' }}>
                    {t('reviews.thankYou')}
                </h3>
                <p style={{ color: '#15803d' }}>
                    {t('reviews.thankYouText')}
                </p>
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid var(--border)'
        }}>
            <h3 className="heading-md" style={{ marginBottom: '24px' }}>
                {t('reviews.leaveReviewFor', { name: providerName })}
            </h3>

            <form onSubmit={handleSubmit}>
                {/* Star Rating */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>
                        {t('reviews.experienceLabel')}
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '2.5rem',
                                    transition: 'transform 0.1s'
                                }}
                            >
                                <span style={{
                                    color: (hoveredRating || rating) >= star ? '#fbbf24' : '#d1d5db'
                                }}>
                                    ★
                                </span>
                            </button>
                        ))}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginTop: '8px' }}>
                        {rating === 1 && t('reviews.ratingPoor')}
                        {rating === 2 && t('reviews.ratingFair')}
                        {rating === 3 && t('reviews.ratingGood')}
                        {rating === 4 && t('reviews.ratingVeryGood')}
                        {rating === 5 && t('reviews.ratingExcellent')}
                    </div>
                </div>

                {/* Comment */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        {t('reviews.commentLabel')}
                    </label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        placeholder={t('reviews.commentPlaceholder')}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            resize: 'vertical'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting || rating === 0}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '14px' }}
                >
                    {submitting ? t('reviews.submitting') : t('reviews.submitReview')}
                </button>
            </form>
        </div>
    );
}
