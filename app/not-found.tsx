import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Страница не найдена | Dastiyor',
};

export default function NotFound() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%)'
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: '500px'
            }}>
                <div style={{
                    fontSize: '8rem',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '16px'
                }}>
                    404
                </div>

                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    marginBottom: '16px',
                    color: 'var(--text)'
                }}>
                    Страница не найдена
                </h1>

                <p style={{
                    color: 'var(--text-light)',
                    fontSize: '1.1rem',
                    marginBottom: '32px',
                    lineHeight: '1.6'
                }}>
                    Упс! Страница, которую вы ищете, не существует или была перемещена.
                </p>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link href="/" className="btn btn-primary">
                        На главную
                    </Link>
                    <Link href="/tasks" className="btn btn-outline">
                        Найти задания
                    </Link>
                </div>

                <div style={{
                    marginTop: '48px',
                    padding: '24px',
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid var(--border)'
                }}>
                    <p style={{ fontWeight: '600', marginBottom: '12px' }}>Ищете что-то?</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Link href="/tasks" style={{ color: 'var(--primary)' }}>
                            📋 Найти задания
                        </Link>
                        <Link href="/create-task" style={{ color: 'var(--primary)' }}>
                            ➕ Создать задание
                        </Link>
                        <Link href="/how-it-works" style={{ color: 'var(--primary)' }}>
                            ❓ Как это работает
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
