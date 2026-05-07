'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export default function CustomerTaskActions({ taskId, taskStatus }: { taskId: string, taskStatus: string }) {
    const router = useRouter();
    const { confirm, Dialog } = useConfirm();
    const [submitting, setSubmitting] = useState(false);

    if (taskStatus !== 'OPEN') return null;

    const handleCancel = async () => {
        const confirmed = await confirm(
            'Are you sure you want to cancel this task? This cannot be undone.',
            'Cancel Task',
            'warning'
        );
        if (!confirmed) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/tasks/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId }),
            });

            if (res.ok) {
                toast.success('Task cancelled successfully');
                router.refresh();
            } else {
                toast.error('Failed to cancel task');
            }
        } catch (error) {
            toast.error('Error cancelling task');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ marginTop: '24px' }}>
            <Dialog />
            <button
                onClick={handleCancel}
                disabled={submitting}
                style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #EF4444',
                    backgroundColor: 'white',
                    color: '#EF4444',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {submitting ? 'Cancelling...' : 'Cancel Task'}
            </button>
        </div>
    );
}
