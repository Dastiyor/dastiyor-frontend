'use client';

import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useHydrated } from '@/lib/useHydrated';
import PushNotificationToggle from '@/components/PushNotificationToggle';

export type AlertTier = 'free' | 'pro' | 'pro_plus' | 'business';

/**
 * The provider's new-task alert switch (PUT /api/profile/task-alerts), with a
 * line saying when alerts arrive on their plan. The button is inert until
 * hydration: before that it has no handler.
 */
export default function TaskAlertsSettings({ initialEnabled, plan }: { initialEnabled: boolean; plan: AlertTier }) {
    const { t, tError } = useTranslation();
    const hydrated = useHydrated();
    const [enabled, setEnabled] = useState(initialEnabled);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const toggle = async () => {
        const next = !enabled;
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/profile/task-alerts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: next }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error ? tError(data.error) : t('taskAlerts.saveError'));
                return;
            }
            setEnabled(typeof data.enabled === 'boolean' ? data.enabled : next);
        } catch {
            setError(t('taskAlerts.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const hint = plan === 'free'
        ? t('taskAlerts.hintFree')
        : plan === 'pro' ? t('taskAlerts.hintPro') : t('taskAlerts.hintInstant');

    return (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1, minWidth: '220px' }}>
                    <BellRing size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>
                            {t('taskAlerts.title')}
                        </h3>
                        <p style={{ color: '#64748B', fontSize: '0.85rem', lineHeight: 1.5 }}>{hint}</p>
                    </div>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={t('taskAlerts.title')}
                    onClick={toggle}
                    disabled={!hydrated || saving}
                    style={{
                        width: '48px', height: '28px', borderRadius: '14px', border: 'none', padding: '3px',
                        backgroundColor: enabled ? 'var(--primary)' : '#CBD5E1',
                        cursor: !hydrated || saving ? 'default' : 'pointer',
                        opacity: saving ? 0.6 : 1, display: 'flex',
                        justifyContent: enabled ? 'flex-end' : 'flex-start', transition: 'background-color 0.2s',
                    }}
                >
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'white', display: 'block' }} />
                </button>
            </div>
            {error && <p role="alert" style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: '10px' }}>{error}</p>}
            {enabled && plan !== 'free' && (
                <div style={{ marginTop: '14px' }}>
                    <p style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '8px' }}>{t('taskAlerts.browserHint')}</p>
                    <PushNotificationToggle />
                </div>
            )}
        </div>
    );
}
