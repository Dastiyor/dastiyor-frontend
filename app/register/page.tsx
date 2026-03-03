'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import { useRouter } from 'next/navigation';
import { checkPasswordStrength } from '@/lib/validation';

type Role = 'customer' | 'provider' | null;

export default function RegisterPage() {
    const [role, setRole] = useState<Role>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setPasswordFeedback([]);

        const formData = new FormData(e.currentTarget);
        const password = String(formData.get('password') || '');
        const { isStrong, feedback } = checkPasswordStrength(password);
        if (!isStrong || password.length < 8) {
            setPasswordFeedback(feedback.length ? feedback : ['Password must be at least 8 characters']);
            setIsLoading(false);
            return;
        }

        const data = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            password,
            role
        };

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Registration failed');
            }

            // Use full page reload to ensure server components refresh
            // This ensures the Header component re-renders with the new auth state
            window.location.href = '/';
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    if (!role) {
        // ... role selection code (same as before) ...
        return (
            <div style={{
                minHeight: 'calc(100vh - 80px)', // Full height minus header
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                backgroundColor: 'var(--secondary)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 className="heading-lg">Присоединяйтесь к Dastiyor</h1>
                    <p style={{ color: 'var(--text-light)', fontSize: '1.1rem' }}>Чтобы начать, выберите вашу роль</p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '24px',
                    width: '100%',
                    maxWidth: '800px'
                }}>
                    {/* Customer Card */}
                    <button
                        onClick={() => setRole('customer')}
                        style={{
                            backgroundColor: 'var(--white)',
                            border: '2px solid transparent',
                            borderRadius: '16px',
                            padding: '40px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '16px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                    >
                        <div style={{
                            width: '80px',
                            height: '80px',
                            backgroundColor: '#e8f0fe',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary)',
                            fontSize: '2rem'
                        }}>
                            👤
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Я хочу найти</h3>
                        <p style={{ color: 'var(--text-light)' }}>Находите специалистов для ваших задач и выполняйте дела.</p>
                    </button>

                    {/* Provider Card */}
                    <button
                        onClick={() => setRole('provider')}
                        style={{
                            backgroundColor: 'var(--white)',
                            border: '2px solid transparent',
                            borderRadius: '16px',
                            padding: '40px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '16px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                    >
                        <div style={{
                            width: '80px',
                            height: '80px',
                            backgroundColor: '#fff3e0',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent)',
                            fontSize: '2rem'
                        }}>
                            💼
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Я хочу работать</h3>
                        <p style={{ color: 'var(--text-light)' }}>Находите задания, развивайте бизнес и зарабатывайте.</p>
                    </button>
                </div>

                <div style={{ marginTop: '40px' }}>
                    Уже есть аккаунт? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Войти</Link>
                </div>
            </div>
        );
    }

    return (
        <AuthLayout
            title={role === 'customer' ? "Sign up as Customer" : "Sign up as Professional"}
            subtitle="Create your account to get started"
        >
            <button
                onClick={() => setRole(null)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-light)',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.9rem'
                }}
            >
                ← Change role
            </button>

            {error && (
                <div style={{
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '0.9rem'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>Full Name</label>
                    <input
                        name="fullName"
                        type="text"
                        placeholder="John Doe"
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>Email Address</label>
                    <input
                        name="email"
                        type="email"
                        placeholder="name@example.com"
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>Phone Number</label>
                    <input
                        name="phone"
                        type="tel"
                        placeholder="+992 00 000 0000"
                        style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>Password</label>
                    <input
                        name="password"
                        type="password"
                        placeholder="Min 8 characters, include letter and number"
                        required
                        minLength={8}
                        style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                        At least 8 characters, one uppercase, one lowercase, one number
                    </span>
                    {passwordFeedback.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#c62828' }}>
                            {passwordFeedback.map((msg, i) => (
                                <li key={i}>{msg}</li>
                            ))}
                        </ul>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`btn ${role === 'provider' ? 'btn-accent' : 'btn-primary'}`}
                    style={{ width: '100%', marginTop: '8px', opacity: isLoading ? 0.7 : 1 }}
                >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.95rem' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>
                    Log In
                </Link>
            </div>
        </AuthLayout>
    );
}
