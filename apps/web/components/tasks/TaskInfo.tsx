'use client';

import { useTranslation } from '@/lib/i18n';

type TaskInfoProps = {
    task: {
        status: string;
        createdAt: string | Date;
        budgetType: string;
        budgetAmount: string | null;
        title: string;
        category: string;
        city: string;
        address: string | null;
        description: string;
        images: string | null;
    };
};

export default function TaskInfo({ task }: TaskInfoProps) {
    const { t } = useTranslation();

    const statusLabel = (() => {
        switch (task.status) {
            case 'OPEN': return t('tasks.open');
            case 'IN_PROGRESS': return t('tasks.inProgress');
            case 'COMPLETED': return t('tasks.completed');
            case 'CANCELLED': return t('tasks.cancelled');
            default: return task.status.toLowerCase();
        }
    })();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Title & Meta */}
            <div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span style={{
                        backgroundColor: '#e8f0fe',
                        color: 'var(--primary)',
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                    }}>
                        {statusLabel}
                    </span>
                    <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                        {t('tasks.publishedBy')} {new Date(task.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                    <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>•</span>
                    <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                        {task.budgetType === 'fixed' ? `${task.budgetAmount} TJS` : t('common.negotiable')}
                    </span>
                </div>

                <h1 className="heading-lg" style={{ marginBottom: '24px' }}>{task.title}</h1>

                <div style={{ display: 'flex', gap: '40px', borderBottom: '1px solid var(--border)', paddingBottom: '24px', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '4px' }}>{t('tasks.category')}</div>
                        <div style={{ fontWeight: '500' }}>{task.category}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '4px' }}>{t('createTask.location')}</div>
                        <div style={{ fontWeight: '500' }}>{task.city}{task.address ? `, ${task.address}` : ''}</div>
                    </div>
                </div>
            </div>

            {/* Description */}
            <div>
                <h3 className="heading-md">{t('tasks.description')}</h3>
                <p style={{ lineHeight: '1.7', color: 'var(--text-light)', whiteSpace: 'pre-wrap' }}>
                    {task.description}
                </p>
            </div>

            {/* Photos */}
            {task.images && (() => {
                try {
                    const images = JSON.parse(task.images);
                    if (Array.isArray(images) && images.length > 0) {
                        return (
                            <div>
                                <h3 className="heading-md" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>{t('tasks.photos')}</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                                    {images.map((url: string, idx: number) => (
                                        <div key={idx} style={{
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            border: '1px solid var(--border)',
                                            aspectRatio: '4/3',
                                            cursor: 'pointer'
                                        }}>
                                            <a href={url} target="_blank" rel="noopener noreferrer">
                                                <img
                                                    src={url}
                                                    alt={`Task photo ${idx + 1}`}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                                                />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }
                } catch (e) {
                    return null;
                }
                return null;
            })()}
        </div>
    );
}
