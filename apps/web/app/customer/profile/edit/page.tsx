'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';

type UserProfile = {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    role: string;
};

export default function CustomerEditProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        avatar: ''
    });

    async function fetchProfile() {
        try {
            const res = await fetch('/api/profile');
            if (res.ok) {
                const data = await res.json();
                setProfile(data.user);
                setFormData({
                    fullName: data.user.fullName || '',
                    phone: data.user.phone || '',
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
    }

    useEffect(() => {
        fetchProfile();
    }, []);

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
                setError('Failed to upload image');
            }
        } catch (err) {
            setError('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Profile updated successfully!');
                setProfile(data.user);
                setTimeout(() => router.push('/customer/profile'), 1500);
            } else {
                setError(data.error || 'Failed to update profile');
            }
        } catch (err) {
            setError('An error occurred');
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
                <p>Loading...</p>
            </div>
        );
    }

    const accentColor = 'var(--primary)';

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ marginBottom: '24px' }}>
                    <Link href="/customer/profile" style={{ color: accentColor, textDecoration: 'none', fontWeight: '500' }}>
                        ← Back to Profile
                    </Link>
                </div>

                <div className="edit-card" style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    padding: '40px',
                    border: '1px solid #E2E8F0'
                }}>
                    <style>{`@media (max-width: 480px) { .edit-card { padding: 20px !important; border-radius: 16px !important; } }`}</style>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', marginBottom: '32px' }}>Edit Profile</h1>

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

                    <form onSubmit={handleSubmit}>
                        {/* Avatar */}
                        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                            <div style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                backgroundColor: formData.avatar ? 'transparent' : accentColor,
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
                                        alt="Avatar"
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
                                {uploading ? 'Uploading...' : '📷 Change Photo'}
                            </button>
                        </div>

                        {/* Full Name */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1E293B' }}>
                                Full Name *
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
                                Email
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
                                Email cannot be changed
                            </p>
                        </div>

                        {/* Phone */}
                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1E293B' }}>
                                Phone Number
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

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Link href="/customer/profile" style={{
                                flex: 1,
                                textAlign: 'center',
                                padding: '14px',
                                border: '1px solid #CBD5E1',
                                borderRadius: '12px',
                                color: '#475569',
                                textDecoration: 'none',
                                fontWeight: '600'
                            }}>
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    backgroundColor: accentColor,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
