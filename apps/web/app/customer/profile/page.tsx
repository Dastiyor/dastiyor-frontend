import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Mail, Phone, Calendar, Edit, User } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function CustomerProfilePage() {
    const { t, locale } = await getServerTranslation();
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        redirect('/login');
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
        redirect('/login');
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.id as string }
    });

    if (!user) {
        redirect('/login');
    }

    const accentColor = 'var(--primary)';
    const dateLocale = locale === 'tj' ? 'tg-TJ' : 'ru-RU';

    return (
        <div>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                        {t('profile.myProfile')}
                    </h1>
                    <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                        {t('profile.manageInfo')}
                    </p>
                </div>
                <Link
                    href="/customer/profile/edit"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        backgroundColor: accentColor,
                        color: 'white',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: '600'
                    }}
                >
                    <Edit size={16} />
                    {t('profile.editProfile')}
                </Link>
            </div>

            {/* Profile Card */}
            <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '24px', maxWidth: '800px' }}>
                <div style={{ display: 'flex', gap: '32px', alignItems: 'start', flexWrap: 'wrap' }}>
                    {/* Avatar */}
                    <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        backgroundColor: accentColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '3rem',
                        flexShrink: 0,
                        overflow: 'hidden',
                        border: '4px solid #F1F5F9'
                    }}>
                        {user.avatar ? (
                            <img src={user.avatar} alt={t('profile.avatar')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            user.fullName.charAt(0).toUpperCase()
                        )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>
                            {user.fullName}
                        </h2>
                        <div style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ padding: '2px 8px', backgroundColor: '#F1F5F9', borderRadius: '4px', fontWeight: '600', fontSize: '0.75rem' }}>{t('profile.roleCustomer')}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#475569', fontSize: '1rem', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                                <Mail size={20} color="#94A3B8" />
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '2px' }}>{t('profile.emailLabel')}</div>
                                    {user.email}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#475569', fontSize: '1rem', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                                <Phone size={20} color="#94A3B8" />
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '2px' }}>{t('profile.phoneLabel')}</div>
                                    {user.phone || t('profile.phoneNotSet')}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#475569', fontSize: '1rem', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                                <Calendar size={20} color="#94A3B8" />
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '2px' }}>{t('profile.memberSinceLabel')}</div>
                                    {new Date(user.createdAt).toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
