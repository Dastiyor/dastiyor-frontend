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
    bio: string | null;
    skills: string | null;
    avatar: string | null;
    role: string;
};

export default function EditProfilePage() {
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
                setTimeout(() => router.push('/profile'), 1500);
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
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--secondary)'
            }}>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container" style={{ maxWidth: '700px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <Link href="/profile" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                        ← Back to Profile
                    </Link>
                </div>

                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    padding: '40px',
                    border: '1px solid var(--border)'
                }}>
                    <h1 className="heading-lg" style={{ marginBottom: '32px' }}>Edit Profile</h1>

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
                                backgroundColor: formData.avatar ? 'transparent' : 'var(--primary)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '3rem',
                                fontWeight: 'bold',
                                margin: '0 auto 16px',
                                overflow: 'hidden',
                                border: '4px solid var(--border)'
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
                                className="btn btn-outline"
                                style={{ fontSize: '0.9rem' }}
                            >
                                {uploading ? 'Uploading...' : '📷 Change Photo'}
                            </button>
                        </div>

                        {/* Full Name */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
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
                                    border: '1px solid var(--border)',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        {/* Email (read-only) */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
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
                                    border: '1px solid var(--border)',
                                    fontSize: '1rem',
                                    backgroundColor: '#f9fafb',
                                    color: 'var(--text-light)'
                                }}
                            />
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '4px' }}>
                                Email cannot be changed
                            </p>
                        </div>

                        {/* Phone */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
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
                                    border: '1px solid var(--border)',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        {/* Bio (for Providers) */}
                        {profile?.role === 'PROVIDER' && (
                            <>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                        Bio / About Me
                                    </label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                                        rows={4}
                                        placeholder="Tell customers about yourself and your experience..."
                                        style={{
                                            width: '100%',
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            fontSize: '1rem',
                                            resize: 'vertical'
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '32px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                        Skills
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.skills}
                                        onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
                                        placeholder="e.g., Plumbing, Electrical, Painting"
                                        style={{
                                            width: '100%',
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            fontSize: '1rem'
                                        }}
                                    />
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '4px' }}>
                                        Separate skills with commas
                                    </p>
                                </div>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Link href="/profile" className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }}>
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn btn-primary"
                                style={{ flex: 1 }}
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
