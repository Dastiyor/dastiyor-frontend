import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DollarSign, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function PaymentHistoryPage() {
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
            payments: {
                orderBy: { createdAt: 'desc' },
                take: 50,
            }
        }
    });

    if (!user || user.role !== 'PROVIDER') {
        redirect('/access-denied');
    }

    const payments = user.payments;
    const completedPayments = payments.filter(p => p.status === 'COMPLETED');
    const totalSpent = completedPayments.reduce((sum, p) => sum + p.amount, 0);

    const { t } = await getServerTranslation();

    const statusConfig: Record<string, { label: string; bg: string; color: string; icon: 'check' | 'x' | 'clock' }> = {
        COMPLETED: { label: t('provider.paymentPaid'), bg: '#D1FAE5', color: '#166634', icon: 'check' },
        PENDING: { label: t('provider.paymentPending'), bg: '#FEF3C7', color: '#92400E', icon: 'clock' },
        FAILED: { label: t('provider.paymentFailed'), bg: '#FEE2E2', color: '#991b1b', icon: 'x' },
        CANCELLED: { label: t('provider.paymentCancelled'), bg: '#FEE2E2', color: '#991b1b', icon: 'x' },
    };

    const StatusIcon = ({ type }: { type: 'check' | 'x' | 'clock' }) => {
        if (type === 'check') return <CheckCircle size={24} color="#10B981" />;
        if (type === 'x') return <XCircle size={24} color="#EF4444" />;
        return <Clock size={24} color="#F59E0B" />;
    };

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container" style={{ maxWidth: '1000px' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 className="heading-lg">{t('provider.paymentHistoryTitle')}</h1>
                    <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>
                        {t('provider.paymentHistoryDesc')}
                    </p>
                </div>

                {/* Summary Card */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '32px',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    marginBottom: '32px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '24px'
                }}>
                    <div>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '8px' }}>{t('provider.totalSpent')}</div>
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>
                            {totalSpent} с.
                        </div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '8px' }}>{t('provider.transactions')}</div>
                        <div style={{ fontSize: '2rem', fontWeight: '700' }}>
                            {completedPayments.length}
                        </div>
                    </div>
                </div>

                {/* Payment History */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    {payments.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>💳</div>
                            <h3 className="heading-md" style={{ marginBottom: '8px' }}>{t('provider.noPayments')}</h3>
                            <p style={{ color: 'var(--text-light)', marginBottom: '24px' }}>
                                {t('provider.noPaymentsDesc')}
                            </p>
                            <a href="/subscription" className="btn btn-primary">
                                {t('provider.viewPlans')}
                            </a>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {payments.map((payment) => {
                                const config = statusConfig[payment.status] || statusConfig.PENDING;
                                return (
                                    <div
                                        key={payment.id}
                                        style={{
                                            padding: '24px',
                                            borderBottom: '1px solid var(--border)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '24px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                            <div style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '12px',
                                                backgroundColor: config.bg,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <StatusIcon type={config.icon} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '4px' }}>
                                                    {payment.description}
                                                </div>
                                                <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-light)', flexWrap: 'wrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Calendar size={14} />
                                                        {new Date(payment.createdAt).toLocaleDateString('ru-RU', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </div>
                                                    <div style={{
                                                        backgroundColor: config.bg,
                                                        color: config.color,
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        {config.label}
                                                    </div>
                                                    {payment.paymentMethod && (
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                                            {payment.paymentMethod}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: '1.5rem',
                                                fontWeight: '700',
                                                color: payment.status === 'COMPLETED' ? 'var(--primary)' : 'var(--text-light)'
                                            }}>
                                                {payment.amount} {payment.currency}
                                            </div>
                                            {payment.smartpayOrderId && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '4px' }}>
                                                    {payment.smartpayOrderId}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
