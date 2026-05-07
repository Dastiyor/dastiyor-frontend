import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function AdminTasksPage() {
    const tasks = await prisma.task.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true } } },
        take: 50
    });

    return (
        <div>
            <h2 className="heading-lg" style={{ marginBottom: '32px' }}>Управление заданиями</h2>

            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '520px' }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Название</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Заказчик</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Статус</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Дата</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.map((task) => (
                            <tr key={task.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ fontWeight: '600' }}>{task.title}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{task.category}</div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    {task.user.fullName}
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        backgroundColor: task.status === 'OPEN' ? '#dbeafe' : task.status === 'COMPLETED' ? '#dcfce7' : '#f3f4f6',
                                        color: task.status === 'OPEN' ? '#1e40af' : task.status === 'COMPLETED' ? '#166534' : '#374151'
                                    }}>
                                        {task.status === 'OPEN' ? 'Открыто' : task.status === 'COMPLETED' ? 'Выполнено' : task.status}
                                    </span>
                                </td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}>
                                    {new Date(task.createdAt).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <Link href={`/tasks/${task.id}`} style={{ marginRight: '12px', color: '#4f46e5', fontWeight: '600', textDecoration: 'none' }}>
                                        Просмотр
                                    </Link>
                                    <button style={{ color: '#dc2626', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        Удалить
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
