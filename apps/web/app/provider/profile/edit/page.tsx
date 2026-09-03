'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

type UserProfile = {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    bio: string | null;
    skills: string | null;
    avatar: string | null;
    role: string;
};

export default function ProviderEditProfilePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        bio: '',
        skills: '',
        avatar: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/profile');
            if (res.ok) {
                const data = await res.json();
                setProfile(data.user);
                setFormData({
                    fullName: data.user.fullName || '',
                    phone: data.user.phone || '',
                    bio: data.user.bio || '',
                    skills: data.user.skills || '',
                    avatar: data.user.avatar || ''
                });
            } else {
                router.push('/login');
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({ ...prev, avatar: data.url }));
            } else {
                setError(t('profileEdit.uploadFailed'));
            }
        } catch (err) {
            setError(t('profileEdit.uploadFailed'));
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(t('profileEdit.updateSuccess'));
                setProfile(data.user);
                setTimeout(() => router.push('/provider/profile'), 1500);
            } else {
                setError(data.error || t('profileEdit.updateFailed'));
            }
        } catch (err) {
            setError(t('reviews.genericError'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                <div style={{ marginBottom: '24px' }}>
                    <Link href="/provider/profile" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>
                        {t('profileEdit.backToProfile')}
                    </Link>
                </div>

                <div className="edit-card" style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    padding: '40px',
                    border: '1px solid #E2E8F0'
                }}>
                    <style>{`@media (max-width: 480px) { .edit-card { padding: 20px !important; border-radius: 16px !important; } }`}</style>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', marginBottom: '32px' }}>{t('profile.editProfile')}</h1>

                    {error && (
                        <div style={{
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Avatar */}
                        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                            <div style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                backgroundColor: formData.avatar ? 'transparent' : 'var(--primary)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '3rem',
                                fontWeight: 'bold',
                                margin: '0 auto 16px',
                                overflow: 'hidden',
                                border: '4px solid #E2E8F0'
                            }}>
                                {formData.avatar ? (
                                    <img
                                        src={formData.avatar}
                                        alt={t('profile.avatar')}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    formData.fullName?.[0]?.toUpperCase() || '?'
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                style={{ display: 'none' }}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'white',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    color: '#475569',
                                    fontWeight: '500'
                                }}
                            >
                                {uploading ? t('profileEdit.uploading') : t('profileEdit.changePhoto')}
                            </button>
                        </div>

                        {/* Full Name */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1E293B' }}>
                                {t('profile.fullName')} *
                            </label>
                            <input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                                required
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid #E2E8F0',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {/* Email (read-only) */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1E293B' }}>
                                {t('profile.email')}
                            </label>
                            <input
                                type="email"
                                value={profile?.email || ''}
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid #E2E8F0',
                                    fontSize: '1rem',
                                    backgroundColor: '#f9fafb',
                                    color: '#94A3B8'
                                }}
                            />
                            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '4px' }}>
                                {t('profileEdit.emailReadOnly')}
                            </p>
                        </div>

                        {/* Phone */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1E293B' }}>
                                {t('profile.phoneLabel')}
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+992 XXX XXX XXX"
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid #E2E8F0',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {/* Bio (for Providers) */}
                        {profile?.role === 'PROVIDER' && (
                            <>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1E293B' }}>
                                        {t('profile.aboutMe')}
                                    </label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                                        rows={4}
                                        placeholder={t('profileEdit.bioPlaceholder')}
                                        style={{
                                            width: '100%',
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            border: '1px solid #E2E8F0',
                                            fontSize: '1rem',
                                            resize: 'vertical',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '32px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1E293B' }}>
                                        {t('profile.skills')}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.skills}
                                        onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
                                        placeholder={t('profileEdit.skillsPlaceholder')}
                                        style={{
                                            width: '100%',
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            border: '1px solid #E2E8F0',
                                            fontSize: '1rem',
                                            outline: 'none'
                                        }}
                                    />
                                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '4px' }}>
                                        {t('profileEdit.skillsHint')}
                                    </p>
                                </div>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Link href="/provider/profile" style={{
                                flex: 1,
                                textAlign: 'center',
                                padding: '12px',
                                border: '1px solid #CBD5E1',
                                borderRadius: '10px',
                                color: '#475569',
                                textDecoration: 'none',
                                fontWeight: '600'
                            }}>
                                {t('common.cancel')}
                            </Link>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    backgroundColor: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                {saving ? t('profileEdit.saving') : t('profile.saveChanges')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
