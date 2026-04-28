'use client';
import { toast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

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
};

export default function TaskSidebar({ task, isOwner, canRespond }: TaskSidebarProps) {
    const { confirm, Dialog } = useConfirm();
    const budgetDisplay = task.budgetType === 'fixed'
        ? `${task.budgetAmount || '0'} TJS`
        : 'Договорная';

    const budgetLabel = task.budgetType === 'fixed' ? 'Фиксированная цена' : 'Открыт к предложениям';

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
        const statusColors: Record<string, { bg: string; text: string }> = {
            'OPEN': { bg: '#e8f5e9', text: '#2e7d32' },
            'IN_PROGRESS': { bg: '#fff3e0', text: '#f57c00' },
            'COMPLETED': { bg: '#e3f2fd', text: '#1976d2' },
            'CANCELLED': { bg: '#ffebee', text: '#c62828' },
        };
        const statusLabels: Record<string, string> = {
            'OPEN': 'ОТКРЫТО',
            'IN_PROGRESS': 'В РАБОТЕ',
            'COMPLETED': 'ЗАВЕРШЕНО',
            'CANCELLED': 'ОТМЕНЕНО'
        };
        const colors = statusColors[task.status] || statusColors['OPEN'];
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
                {statusLabels[task.status] || task.status}
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
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '4px' }}>Бюджет</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>{budgetDisplay}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{budgetLabel}</div>
                </div>

                {canRespond && task.status === 'OPEN' && (
                    <button
                        onClick={scrollToResponses}
                        className="btn btn-primary"
                        style={{ width: '100%', fontSize: '1.1rem', padding: '16px' }}
                    >
                        Сделать предложение
                    </button>
                )}

                {isOwner && task.status === 'OPEN' && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', textAlign: 'center' }}>
                        Ожидание предложений от исполнителей
                    </p>
                )}

                {task.status === 'IN_PROGRESS' && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: '500', textAlign: 'center' }}>
                        🔧 Задание выполняется
                    </p>
                )}

                {task.status === 'COMPLETED' && (
                    <p style={{ fontSize: '0.9rem', color: '#22c55e', fontWeight: '500', textAlign: 'center' }}>
                        ✅ Задание завершено
                    </p>
                )}

                {isOwner && task.status === 'OPEN' && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                        <button
                            onClick={async () => {
                                const confirmed = await confirm(
                                    'Вы уверены, что хотите отменить задание?',
                                    'Отменить задание',
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
                                        toast.success('Задание отменено');
                                        setTimeout(() => window.location.reload(), 1000);
                                    } else {
                                        toast.error('Не удалось отменить задание');
                                    }
                                } catch (e) {
                                    toast.error('Ошибка отмены задания');
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
                            Отменить задание
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
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>Опубликовано</h4>

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
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>Регистрация: {registeredDate}</div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
