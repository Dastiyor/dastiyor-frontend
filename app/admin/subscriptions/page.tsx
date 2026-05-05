import { prisma } from '@/lib/prisma';

export default async function AdminSubscriptionsPage() {
    const subscriptions = await prisma.subscription.findMany({
        orderBy: { startDate: 'desc' },
        include: { user: { select: { fullName: true, email: true } } },
        take: 50
    });

    return (
        <div>
            <h2 className="heading-lg" style={{ marginBottom: '32px' }}>Управление подписками</h2>

            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Пользователь</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>План</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Статус</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Начало</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Окончание</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subscriptions.map((sub) => {
                            const isActive = sub.isActive && new Date(sub.endDate) > new Date();
                            return (
                                <tr key={sub.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ fontWeight: '600' }}>{sub.user.fullName}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{sub.user.email}</div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{sub.plan}</span>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            backgroundColor: isActive ? '#dcfce7' : '#fee2e2',
                                            color: isActive ? '#166534' : '#991b1b'
                                        }}>
                                            {isActive ? 'Активна' : 'Истекла'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', color: '#6b7280' }}>
                                        {new Date(sub.startDate).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '16px 24px', color: '#6b7280' }}>
                                        {new Date(sub.endDate).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <button style={{ color: '#dc2626', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>
                                            Отменить
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}
