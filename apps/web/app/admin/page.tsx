import { prisma } from '@/lib/prisma';

export default async function AdminDashboard() {
    // Fetch stats
    const usersCount = await prisma.user.count();
    const providersCount = await prisma.user.count({ where: { role: 'PROVIDER' } });
    const tasksCount = await prisma.task.count();
    const subscriptionsCount = await prisma.subscription.count({ where: { isActive: true } });

    return (
        <div>
            <h2 className="heading-lg" style={{ marginBottom: '32px' }}>Обзор панели</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                <StatCard title="Всего пользователей" value={usersCount} color="blue" />
                <StatCard title="Исполнители" value={providersCount} color="indigo" />
                <StatCard title="Всего заданий" value={tasksCount} color="green" />
                <StatCard title="Активные подписки" value={subscriptionsCount} color="purple" />
            </div>

            <div style={{ marginTop: '40px', padding: '32px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                <h3 className="heading-md" style={{ marginBottom: '16px' }}>Состояние системы</h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
                    <span>Все системы работают нормально</span>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, color }: { title: string, value: number, color: string }) {
    const colors: any = {
        blue: { bg: '#eff6ff', text: '#1e40af' },
        indigo: { bg: '#eef2ff', text: '#3730a3' },
        green: { bg: '#f0fdf4', text: '#166534' },
        purple: { bg: '#faf5ff', text: '#6b21a8' },
    };
    const c = colors[color] || colors.blue;

    return (
        <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '8px' }}>{title}</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: c.text }}>{value}</div>
        </div>
    );
}
