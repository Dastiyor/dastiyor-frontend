'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (res.ok) {
                setSubmitted(true);
                if (data.debug_token) {
                    console.log('Debug Reset Token:', data.debug_token);
                }
            } else {
                setError(data.error || 'Что-то пошло не так');
            }
        } catch (err) {
            setError('Ошибка сети. Попробуйте ещё раз.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <AuthLayout title="Письмо отправлено" subtitle={`Если аккаунт с адресом ${email} существует, мы отправили ссылку для сброса пароля.`}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '24px' }}>📧</div>
                    <p style={{ color: 'var(--text-light)', marginBottom: '24px', lineHeight: '1.6', fontSize: '0.9rem' }}>
                        Ссылка действительна 1 час. Не получили письмо? Проверьте папку «Спам» или попробуйте ещё раз.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button onClick={() => setSubmitted(false)} className="btn btn-outline">
                            Попробовать снова
                        </button>
                        <Link href="/login" className="btn btn-primary">
                            Войти
                        </Link>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Забыли пароль?" subtitle="Введите email — мы отправим ссылку для сброса.">
            {error && (
                <div style={{
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '0.9rem'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ width: '100%', opacity: loading ? 0.7 : 1 }}
                >
                    {loading ? 'Отправка...' : 'Отправить ссылку'}
                </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.95rem' }}>
                <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>
                    ← Вернуться ко входу
                </Link>
            </div>
        </AuthLayout>
    );
}
