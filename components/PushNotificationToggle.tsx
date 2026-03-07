'use client';

import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/lib/usePushNotifications';

export default function PushNotificationToggle() {
    const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

    if (!isSupported) return null;

    const handleToggle = async () => {
        if (isSubscribed) {
            await unsubscribe();
        } else {
            await subscribe();
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isLoading}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: isSubscribed ? '2px solid #10B981' : '2px solid var(--border)',
                backgroundColor: isSubscribed ? '#ECFDF5' : 'white',
                color: isSubscribed ? '#065F46' : 'var(--text)',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.2s',
            }}
        >
            {isSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
            {isLoading
                ? 'Загрузка...'
                : isSubscribed
                    ? 'Push-уведомления включены'
                    : 'Включить push-уведомления'
            }
        </button>
    );
}
