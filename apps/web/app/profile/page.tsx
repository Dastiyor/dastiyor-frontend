import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerTranslation } from '@/lib/i18n/server';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';

export default async function ProfilePage() {
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
        where: { id: payload.id as string },
        include: {
            _count: {
                select: { tasks: true, responses: true }
            },
            subscription: true
        }
    });

    if (!user) {
        redirect('/login');
    }

    const subscription = user.subscription;
    const isSubscribed = subscription?.isActive &&
        subscription?.endDate &&
        new Date(subscription.endDate) > new Date();

    const daysRemaining = isSubscribed && subscription?.endDate
        // eslint-disable-next-line react-hooks/purity
        ? Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

    const skills = user.skills ? user.skills.split(',').map(s => s.trim()) : [];
    const { t } = await getServerTranslation();

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '60px 0' }}>
            <div className="container" style={{ maxWidth: '800px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1 className="heading-lg">{t('profile.myProfile')}</h1>
                    <Link href="/profile/edit" className="btn btn-outline">
                        ✏️ {t('profile.edit')}
                    </Link>
                </div>

                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    padding: '40px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '40px' }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            backgroundColor: user.avatar ? 'transparent' : 'var(--primary)',
                            color: 'white',
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            border: '4px solid var(--border)'
                        }}>
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.fullName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                user.fullName[0].toUpperCase()
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>{user.fullName}</h2>
                            <div style={{ color: 'var(--text-light)', fontSize: '1.1rem' }}>{user.email}</div>
                            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{
                                    backgroundColor: '#e8f0fe',
                                    color: 'var(--primary)',
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    fontSize: '0.9rem',
                                    fontWeight: '600'
                                }}>
                                    {user.role === 'PROVIDER' ? t('profile.roleProvider') : t('profile.roleCustomer')}
                                </span>
                                {SUBSCRIPTIONS_ENABLED && isSubscribed && subscription && (
                                    <span style={{
                                        backgroundColor: '#fef3c7',
                                        color: '#b45309',
                                        padding: '6px 16px',
                                        borderRadius: '20px',
                                        fontSize: '0.9rem',
                                        fontWeight: '600'
                                    }}>
                                        ⭐ {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} {t('profile.member')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bio for Providers */}
                    {user.role === 'PROVIDER' && user.bio && (
                        <div style={{
                            padding: '20px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '12px',
                            marginBottom: '24px'
                        }}>
                            <label style={{ display: 'block', color: 'var(--text-light)', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>{t('profile.aboutMe')}</label>
                            <p style={{ lineHeight: '1.7', color: 'var(--text)' }}>{user.bio}</p>
                        </div>
                    )}

                    {/* Skills for Providers */}
                    {user.role === 'PROVIDER' && skills.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: 'var(--text-light)', marginBottom: '12px', fontSize: '0.9rem', fontWeight: '500' }}>{t('profile.skills')}</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {skills.map((skill, i) => (
                                    <span
                                        key={i}
                                        style={{
                                            backgroundColor: 'var(--primary)',
                                            color: 'white',
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TODO: Re-enable subscription status block when payment gateway is ready */}

                    <div className="profile-stats-grid" style={{ display: 'grid', gridTemplateColumns: user.role === 'PROVIDER' ? 'repeat(3, 1fr)' : '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
                        <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#f9fafb', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>{user._count.tasks}</div>
                            <div style={{ color: 'var(--text-light)' }}>{t('profile.tasksPosted')}</div>
                        </div>
                        <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#f9fafb', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>{user._count.responses}</div>
                            <div style={{ color: 'var(--text-light)' }}>{t('profile.responsesSent')}</div>
                        </div>
                        {user.role === 'PROVIDER' && (
                            <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px', color: '#166534' }}>
                                    {user.balance.toFixed(2)} с.
                                </div>
                                <div style={{ color: '#15803d' }}>{t('profile.balance')}</div>
                            </div>
                        )}
                    </div>

                    {/* Provider Dashboard Links */}
                    {user.role === 'PROVIDER' && (
                        <div style={{ marginBottom: '40px', padding: '24px', backgroundColor: '#F9FAFB', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <h3 className="heading-md" style={{ marginBottom: '16px' }}>{t('profile.providerDashboard')}</h3>
                            <div className="profile-dash-links" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                <Link href="/provider/my-responses" className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }}>
                                    📝 {t('profile.myResponses')}
                                </Link>
                                <Link href="/provider/active-tasks" className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }}>
                                    ⚡ {t('profile.activeTasks')}
                                </Link>
                                <Link href="/provider/completed-tasks" className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }}>
                                    ✅ {t('profile.completedTasks')}
                                </Link>
                                {SUBSCRIPTIONS_ENABLED && (
                                    <Link href="/provider/payment-history" className="btn btn-outline" style={{ justifyContent: 'flex-start', textAlign: 'left' }}>
                                        💳 {t('profile.paymentHistory')}
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                        <h3 className="heading-md" style={{ marginBottom: '24px' }}>{t('profile.accountInfo')}</h3>
                        <div style={{ display: 'grid', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-light)', marginBottom: '4px', fontSize: '0.9rem' }}>{t('profile.fullNameLabel')}</label>
                                <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{user.fullName}</div>
                            </div>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-light)', marginBottom: '4px', fontSize: '0.9rem' }}>{t('profile.emailLabel')}</label>
                                <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{user.email}</div>
                            </div>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-light)', marginBottom: '4px', fontSize: '0.9rem' }}>{t('profile.phoneLabel')}</label>
                                <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{user.phone || t('profile.phoneNotSet')}</div>
                            </div>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-light)', marginBottom: '4px', fontSize: '0.9rem' }}>{t('profile.memberSinceLabel')}</label>
                                <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{new Date(user.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            <style>{`
                @media (max-width: 480px) { .profile-stats-grid { grid-template-columns: 1fr !important; } }
                @media (max-width: 400px) { .profile-dash-links { grid-template-columns: 1fr !important; } }
            `}</style>
            </div>
        </div>
    );
}
