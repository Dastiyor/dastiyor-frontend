'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { validatePassword, checkPasswordStrength } from '@/lib/validation';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [isValid, setIsValid] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (token) {
            validateToken();
        } else {
            setValidating(false);
            setIsValid(false);
        }
    }, [token]);

    const validateToken = async () => {
        try {
            const res = await fetch(`/api/auth/reset-password?token=${token}`);
            const data = await res.json();
            setIsValid(data.valid);
        } catch (err) {
            setIsValid(false);
        } finally {
            setValidating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const { valid, error: validationError } = validatePassword(password);
        if (!valid) {
            setError(validationError || 'Password too weak');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
            } else {
                setError(data.error || 'Something went wrong');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (validating) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    padding: '48px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
                    <p>Validating reset link...</p>
                </div>
            </div>
        );
    }

    if (!token || !isValid) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    padding: '48px',
                    maxWidth: '450px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '24px' }}>❌</div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '16px' }}>
                        Invalid or Expired Link
                    </h1>
                    <p style={{ color: 'var(--text-light)', marginBottom: '32px', lineHeight: '1.6' }}>
                        This password reset link is invalid or has expired. Please request a new one.
                    </p>
                    <Link href="/forgot-password" className="btn btn-primary">
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    padding: '48px',
                    maxWidth: '450px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '24px' }}>✅</div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '16px' }}>
                        Password Reset!
                    </h1>
                    <p style={{ color: 'var(--text-light)', marginBottom: '32px', lineHeight: '1.6' }}>
                        Your password has been successfully reset. You can now log in with your new password.
                    </p>
                    <Link href="/login" className="btn btn-primary">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '24px',
                padding: '48px',
                maxWidth: '450px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <Link href="/" style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: 'var(--primary)',
                        textDecoration: 'none'
                    }}>
                        Dastiyor
                    </Link>
                </div>

                <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px', textAlign: 'center' }}>
                    Reset Your Password
                </h1>
                <p style={{
                    color: 'var(--text-light)',
                    textAlign: 'center',
                    marginBottom: '32px'
                }}>
                    Choose a strong new password for your account
                </p>

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

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '500'
                        }}>
                            New Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => {
                                const p = e.target.value;
                                setPassword(p);
                                if (!p) {
                                    setPasswordFeedback([]);
                                    return;
                                }
                                const { isStrong, feedback } = checkPasswordStrength(p);
                                setPasswordFeedback(isStrong ? [] : feedback);
                            }}
                            onBlur={() => {
                                if (!password) return;
                                const { isStrong, feedback } = checkPasswordStrength(password);
                                setPasswordFeedback(isStrong ? [] : feedback);
                            }}
                            placeholder="Min 8 characters, uppercase, lowercase, number"
                            required
                            minLength={8}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: `1px solid ${passwordFeedback.length > 0 ? '#ef4444' : 'var(--border)'}`,
                                fontSize: '1rem'
                            }}
                        />
                        {passwordFeedback.length > 0 && (
                            <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '0.85rem', color: '#c62828' }}>
                                {passwordFeedback.map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                ))}
                            </ul>
                        )}
                        {password.length >= 8 && passwordFeedback.length === 0 && (
                            <span style={{ display: 'block', marginTop: '6px', fontSize: '0.85rem', color: '#059669', fontWeight: '500' }}>✓ Password meets requirements</span>
                        )}
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '500'
                        }}>
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '16px',
                            fontSize: '1rem'
                        }}
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    padding: '48px',
                    textAlign: 'center'
                }}>
                    <p>Loading...</p>
                </div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
