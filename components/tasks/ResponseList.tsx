'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

type ResponseListProps = {
    taskId: string;
    responses: any[];
    currentUserId: string | null;
    taskOwnerId: string;
    assignedUserId?: string | null;
    taskStatus?: string;
};

export default function ResponseList({ taskId, responses, currentUserId, taskOwnerId, assignedUserId, taskStatus }: ResponseListProps) {
    const router = useRouter();
    const { confirm, Dialog } = useConfirm();
    const [submitting, setSubmitting] = useState(false);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [completingTask, setCompletingTask] = useState(false);

    const isOwner = currentUserId === taskOwnerId;
    const canRespond = currentUserId && !isOwner && taskStatus === 'OPEN';
    const isTaskOpen = taskStatus === 'OPEN';
    const isTaskInProgress = taskStatus === 'IN_PROGRESS';


    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data = {
            taskId,
            message: formData.get('message'),
            price: formData.get('price'),
            estimatedTime: formData.get('estimatedTime'),
        };

        try {
            const res = await fetch('/api/responses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const json = await res.json();

            if (res.ok) {
                toast.success('Отклик успешно отправлен!');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                // TODO: Re-enable subscription redirect when payment gateway is ready
                // if (res.status === 403 && json.code === 'SUBSCRIPTION_REQUIRED') {
                //     const confirmed = await confirm(
                //         'Для ответа на задания требуется активная подписка. Перейти к планам?',
                //         'Требуется подписка',
                //         'warning'
                //     );
                //     if (confirmed) {
                //         router.push('/provider/subscription');
                //     }
                // } else {
                //     toast.error(json.error || 'Не удалось отправить отклик');
                // }
                toast.error(json.error || 'Не удалось отправить отклик');
            }
        } catch (err) {
            toast.error('Ошибка при отправке отклика');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleAccept(providerId: string) {
        const confirmed = await confirm(
            'Вы уверены, что хотите принять это предложение? Задание будет отмечено как "В работе".',
            'Принять предложение',
            'info'
        );
        if (!confirmed) return;

        setAcceptingId(providerId);
        try {
            const res = await fetch('/api/tasks/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId, providerId }),
            });

            if (res.ok) {
                toast.success('Предложение принято!');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                toast.error('Не удалось принять предложение');
            }
        } catch (err) {
            toast.error('Ошибка при принятии предложения');
        } finally {
            setAcceptingId(null);
        }
    }

    async function handleReject(responseId: string) {
        const confirmed = await confirm(
            'Вы уверены, что хотите отклонить этот отклик?',
            'Отклонить отклик',
            'warning'
        );
        if (!confirmed) return;

        setRejectingId(responseId);
        try {
            const res = await fetch('/api/responses/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ responseId }),
            });

            if (res.ok) {
                toast.success('Отклик отклонен');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                const json = await res.json();
                toast.error(json.error || 'Не удалось отклонить отклик');
            }
        } catch (err) {
            toast.error('Ошибка при отклонении отклика');
        } finally {
            setRejectingId(null);
        }
    }

    async function handleComplete() {
        const confirmed = await confirm(
            'Вы уверены, что задание выполнено? Это действие нельзя отменить.',
            'Завершить задание',
            'warning'
        );
        if (!confirmed) return;

        setCompletingTask(true);
        try {
            const res = await fetch('/api/tasks/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId }),
            });

            if (res.ok) {
                toast.success('Задание отмечено как выполненное!');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                toast.error('Не удалось отметить задание как выполненное');
            }
        } catch (err) {
            toast.error('Ошибка при завершении задания');
        } finally {
            setCompletingTask(false);
        }
    }

    return (
        <>
            <Dialog />
            <div style={{ marginTop: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 className="heading-md">Отклики ({responses.length})</h3>

                    {isOwner && isTaskInProgress && (
                        <button
                            onClick={handleComplete}
                            className="btn"
                            disabled={completingTask}
                            style={{
                                backgroundColor: '#22c55e',
                                color: 'white',
                                padding: '12px 24px',
                                fontWeight: '600'
                            }}
                        >
                            {completingTask ? 'Завершение...' : '✓ Отметить завершенным'}
                        </button>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {responses.map((response) => {
                        const isAccepted = assignedUserId === response.userId;
                        const isRejected = response.status === 'REJECTED';
                        const isPending = response.status === 'PENDING';
                        // If task is not open and this user is not the assigned one, maybe dim it?
                        const isOtherAccepted = !isTaskOpen && !isAccepted;

                        return (
                            <div key={response.id} style={{
                                backgroundColor: isAccepted ? '#f0fdf4' : isRejected ? '#fef2f2' : 'var(--white)',
                                borderColor: isAccepted ? '#22c55e' : isRejected ? '#ef4444' : 'var(--border)',
                                padding: '24px',
                                borderRadius: '12px',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                opacity: isOtherAccepted ? 0.6 : 1
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                            {response.user.fullName[0]}
                                        </div>
                                        <div>
                                            <Link
                                                href={`/provider/${response.userId}`}
                                                style={{ fontWeight: '600', color: 'var(--primary)', textDecoration: 'none' }}
                                            >
                                                {response.user.fullName}
                                            </Link>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                                Исполнитель
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{response.price} с.</div>
                                        {isAccepted && <div style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 'bold' }}>ПРИНЯТО</div>}
                                        {isRejected && <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold' }}>ОТКЛОНЕНО</div>}
                                        {response.estimatedTime && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '4px' }}>
                                                ⏱ {response.estimatedTime}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <p style={{ color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
                                    {response.message}
                                </p>

                                {isOwner && isTaskOpen && isPending && (
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            onClick={() => handleAccept(response.userId)}
                                            className="btn btn-primary"
                                            disabled={acceptingId !== null}
                                            style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                                        >
                                            {acceptingId === response.userId ? 'Принятие...' : 'Принять предложение'}
                                        </button>
                                        <button
                                            onClick={() => handleReject(response.id)}
                                            className="btn"
                                            disabled={rejectingId !== null}
                                            style={{
                                                fontSize: '0.9rem',
                                                padding: '8px 16px',
                                                backgroundColor: 'white',
                                                color: '#ef4444',
                                                border: '1px solid #ef4444'
                                            }}
                                        >
                                            {rejectingId === response.id ? 'Отклонение...' : 'Отклонить'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {responses.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                            Пока нет откликов.
                        </div>
                    )}
                </div>

                {/* Response Form */}
                {canRespond && (
                    <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px solid var(--border)' }}>
                        <h3 className="heading-md" style={{ marginBottom: '24px' }}>Отправить отклик</h3>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Ваша цена (с.)</label>
                                <input
                                    name="price"
                                    type="number"
                                    required
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Примерное время выполнения (опционально)</label>
                                <input
                                    name="estimatedTime"
                                    type="text"
                                    placeholder="например: 2 часа, 1 день, 3-5 дней"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Сообщение</label>
                                <textarea
                                    name="message"
                                    required
                                    rows={4}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                                    placeholder="Опишите, почему вы подходите для этой задачи..."
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting}
                            >
                                {submitting ? 'Отправка...' : 'Отправить предложение'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </>
    );
}
