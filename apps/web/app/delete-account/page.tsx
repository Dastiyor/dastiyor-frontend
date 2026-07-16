'use client';

import { useState } from 'react';
import Link from 'next/link';

// Public account-deletion page. Required by the Google Play Data safety
// policy: the store listing must link to a web page where users can delete
// their account. Deletion itself reuses DELETE /api/account (cookie auth).
export default function DeleteAccountPage() {
    const [status, setStatus] = useState<'idle' | 'confirming' | 'deleting' | 'done' | 'unauthorized' | 'error'>('idle');

    async function handleDelete() {
        setStatus('deleting');
        try {
            const res = await fetch('/api/account', { method: 'DELETE' });
            if (res.ok) setStatus('done');
            else if (res.status === 401) setStatus('unauthorized');
            else setStatus('error');
        } catch {
            setStatus('error');
        }
    }

    const text = { color: 'var(--text-light)', lineHeight: '1.8' } as const;

    return (
        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 20px' }}>
            <h1 style={{ marginBottom: '16px' }}>Удаление аккаунта Dastiyor</h1>
            <p style={{ ...text, marginBottom: '16px' }}>
                Вы можете безвозвратно удалить свой аккаунт Dastiyor и все связанные с ним данные:
                профиль, задания, отклики, сообщения, отзывы и уведомления. Это действие нельзя отменить.
            </p>
            <p style={{ ...text, marginBottom: '16px' }}>Способы удаления:</p>
            <ul style={{ ...text, paddingLeft: '20px', marginBottom: '24px' }}>
                <li>В мобильном приложении: Профиль → Удалить аккаунт.</li>
                <li>На этом сайте: войдите в аккаунт и нажмите кнопку ниже.</li>
                <li>
                    По email: напишите на{' '}
                    <a href="mailto:admin@dastiyor.com">admin@dastiyor.com</a> с адреса, привязанного к аккаунту.
                </li>
            </ul>

            {status === 'idle' && (
                <button
                    onClick={() => setStatus('confirming')}
                    style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}
                >
                    Удалить мой аккаунт
                </button>
            )}
            {status === 'confirming' && (
                <div>
                    <p style={{ ...text, marginBottom: '12px' }}>
                        Вы уверены? Все данные будут удалены безвозвратно.
                    </p>
                    <button
                        onClick={handleDelete}
                        style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', marginRight: '12px' }}
                    >
                        Да, удалить навсегда
                    </button>
                    <button
                        onClick={() => setStatus('idle')}
                        style={{ background: 'transparent', border: '1px solid var(--text-light)', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}
                    >
                        Отмена
                    </button>
                </div>
            )}
            {status === 'deleting' && <p style={text}>Удаление…</p>}
            {status === 'done' && <p style={text}>Ваш аккаунт удалён. Спасибо, что пользовались Dastiyor.</p>}
            {status === 'unauthorized' && (
                <p style={text}>
                    Вы не вошли в аккаунт. <Link href="/login">Войдите</Link> и вернитесь на эту страницу, чтобы удалить аккаунт.
                </p>
            )}
            {status === 'error' && <p style={text}>Не удалось удалить аккаунт. Попробуйте позже или напишите на admin@dastiyor.com.</p>}
        </main>
    );
}
