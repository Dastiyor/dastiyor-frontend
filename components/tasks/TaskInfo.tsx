'use client';

// Function to format date time "Tomorrow, 14:00" style or simpler
const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

type TaskInfoProps = {
    task: any; // We can improve typing later with Prisma generated types
};

export default function TaskInfo({ task }: TaskInfoProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Title & Meta */}
            <div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{
                        backgroundColor: '#e8f0fe',
                        color: 'var(--primary)',
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                    }}>
                        {task.status.toLowerCase()}
                    </span>
                    <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                        Posted {new Date(task.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                    <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>•</span>
                    <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{task.budgetType === 'fixed' ? `${task.budgetAmount} TJS` : 'Negotiable'}</span>
                </div>

                <h1 className="heading-lg" style={{ marginBottom: '24px' }}>{task.title}</h1>

                <div style={{ display: 'flex', gap: '40px', borderBottom: '1px solid var(--border)', paddingBottom: '24px' }}>
                    <div>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '4px' }}>Category</div>
                        <div style={{ fontWeight: '500' }}>{task.category}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '4px' }}>Location</div>
                        <div style={{ fontWeight: '500' }}>{task.city}{task.address ? `, ${task.address}` : ''}</div>
                    </div>
                    {/* Simplified "When" logic for now as we don't capture date yet, relying on created time or description */}
                </div>
            </div>

            {/* Description */}
            <div>
                <h3 className="heading-md">Description</h3>
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
                                <h3 className="heading-md" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Photos</h3>
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
