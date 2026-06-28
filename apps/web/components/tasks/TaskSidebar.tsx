'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useTranslation } from '@/lib/i18n';

type TaskSidebarProps = {
    task: {
        id: string; // Add this
        budgetType: string;
        budgetAmount: string | null;
        status: string;
        user: {
            fullName: string;
            createdAt: Date;
        };
    };
    isOwner: boolean;
    canRespond: boolean;
    isLoggedIn?: boolean;
};

export default function TaskSidebar({ task, isOwner, canRespond, isLoggedIn }: TaskSidebarProps) {
    const { confirm, Dialog } = useConfirm();
    const pathname = usePathname();
    const { t } = useTranslation();

    const budgetDisplay = task.budgetType === 'fixed'
        ? `${task.budgetAmount || '0'} TJS`
        : t('common.negotiable');

    const budgetLabel = task.budgetType === 'fixed' ? t('tasks.fixedPrice') : t('tasks.openToOffers');

    const initials = task.user.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const registeredDate = task.user.createdAt
        ? new Date(task.user.createdAt).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })
        : '—';

    const scrollToResponses = () => {
        document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' });
    };

    const getStatusBadge = () => {
        const statusColorMap: Record<string, { bg: string; text: string }> = {
            'OPEN': { bg: '#e8f5e9', text: '#2e7d32' },
            'IN_PROGRESS': { bg: '#fff3e0', text: '#f57c00' },
            'COMPLETED': { bg: '#e3f2fd', text: '#1976d2' },
            'CANCELLED': { bg: '#ffebee', text: '#c62828' },
        };
        const statusLabelMap: Record<string, string> = {
            'OPEN': t('tasks.open').toUpperCase(),
            'IN_PROGRESS': t('tasks.inProgress').toUpperCase(),
            'COMPLETED': t('tasks.completed').toUpperCase(),
            'CANCELLED': t('tasks.cancelled').toUpperCase(),
        };
        const colors = statusColorMap[task.status] || statusColorMap['OPEN'];
        return (
            <div style={{
                backgroundColor: colors.bg,
                color: colors.text,
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.9rem',
                textAlign: 'center',
                marginBottom: '16px'
            }}>
                {statusLabelMap[task.status] || task.status}
            </div>
        );
    };

    return (
        <>
            <Dialog />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Action Card */}
            <div style={{
                backgroundColor: 'var(--white)',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
                {getStatusBadge()}

                <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '4px' }}>{t('tasks.budget')}</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>{budgetDisplay}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{budgetLabel}</div>
                </div>

                {canRespond && task.status === 'OPEN' && (
                    <button
                        onClick={scrollToResponses}
                        className="btn btn-primary"
                        style={{ width: '100%', fontSize: '1.1rem', padding: '16px' }}
                    >
                        {t('tasks.respondButton')}
                    </button>
                )}

                {!canRespond && !isOwner && task.status === 'OPEN' && !isLoggedIn && (
                    <Link
                        href={`/login?redirect=${encodeURIComponent(pathname)}`}
                        className="btn btn-primary"
                        style={{ width: '100%', fontSize: '1.1rem', padding: '16px', textAlign: 'center' }}
                    >
                        {t('tasks.loginToRespond')}
                    </Link>
                )}
                {!canRespond && !isOwner && task.status === 'OPEN' && isLoggedIn && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', textAlign: 'center', padding: '8px 0' }}>
                        {t('tasks.onlyProvidersCanRespond')}
                    </p>
                )}

                {isOwner && task.status === 'OPEN' && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', textAlign: 'center' }}>
                        {t('tasks.waitingForOffers')}
                    </p>
                )}

                {task.status === 'IN_PROGRESS' && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: '500', textAlign: 'center' }}>
                        🔧 {t('tasks.taskInProgress')}
                    </p>
                )}

                {task.status === 'COMPLETED' && (
                    <p style={{ fontSize: '0.9rem', color: '#22c55e', fontWeight: '500', textAlign: 'center' }}>
                        ✅ {t('tasks.taskDone')}
                    </p>
                )}

                {isOwner && task.status === 'OPEN' && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                        <button
                            onClick={async () => {
                                const confirmed = await confirm(
                                    t('tasks.cancelConfirm'),
                                    t('tasks.cancelTask'),
                                    'warning'
                                );
                                if (!confirmed) return;
                                try {
                                    const res = await fetch('/api/tasks/cancel', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ taskId: task.id })
                                    });
                                    if (res.ok) {
                                        toast.success(t('common.done'));
                                        setTimeout(() => window.location.reload(), 1000);
                                    } else {
                                        toast.error(t('common.error'));
                                    }
                                } catch (e) {
                                    toast.error(t('common.error'));
                                }
                            }}
                            className="btn btn-outline"
                            style={{
                                width: '100%',
                                fontSize: '0.9rem',
                                color: '#dc2626',
                                borderColor: '#fecaca',
                                backgroundColor: '#fef2f2'
                            }}
                        >
                            {t('tasks.cancelTask')}
                        </button>
                    </div>
                )}
            </div>

            {/* Customer Profile */}
            <div style={{
                backgroundColor: 'var(--white)',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
            }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>{t('tasks.publishedBy')}</h4>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: '600'
                    }}>
                        {initials}
                    </div>
                    <div>
                        <div style={{ fontWeight: '600' }}>{task.user.fullName}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{t('tasks.registeredSince')} {registeredDate}</div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
