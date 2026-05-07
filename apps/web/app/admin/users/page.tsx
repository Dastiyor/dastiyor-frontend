import { prisma } from '@/lib/prisma';

export default async function AdminUsersPage() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    return (
        <div>
            <h2 className="heading-lg" style={{ marginBottom: '32px' }}>Управление пользователями</h2>

            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '560px' }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '16px 24px', fontWeight: '600', width: '250px' }}>Пользователь</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Роль</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Email</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Дата регистрации</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ fontWeight: '600' }}>{user.fullName}</div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        backgroundColor: user.role === 'ADMIN' ? '#fee2e2' : user.role === 'PROVIDER' ? '#e0e7ff' : '#f3f4f6',
                                        color: user.role === 'ADMIN' ? '#991b1b' : user.role === 'PROVIDER' ? '#3730a3' : '#374151'
                                    }}>
                                        {user.role === 'ADMIN' ? 'Админ' : user.role === 'PROVIDER' ? 'Исполнитель' : 'Заказчик'}
                                    </span>
                                </td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}>
                                    {user.email}
                                </td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}>
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <button style={{ color: '#dc2626', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        Блокировать
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}
