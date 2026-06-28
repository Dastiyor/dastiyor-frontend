import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function MyTasksPage() {
    const { t } = await getServerTranslation();
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        redirect('/login');
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
        redirect('/login');
    }

    const tasks = await prisma.task.findMany({
        where: {
            userId: payload.id as string
        },
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            _count: {
                select: { responses: true }
            }
        }
    });

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1 className="heading-lg">{t('customer.myTasks')}</h1>
                    <Link href="/create-task" className="btn btn-primary">
                        {t('tasks.createNewTask')}
                    </Link>
                </div>

                {tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <h3 className="heading-md" style={{ marginBottom: '16px' }}>{t('tasks.noActiveTasks')}</h3>
                        <p style={{ color: 'var(--text-light)', marginBottom: '32px' }}>{t('customer.createFirstTaskDesc')}</p>
                        <Link href="/create-task" className="btn btn-primary">{t('customer.createTask')}</Link>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        {tasks.map((task) => (
                            <div key={task.id} style={{
                                backgroundColor: 'white',
                                padding: '24px',
                                borderRadius: '16px',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '20px'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                                        <span style={{
                                            backgroundColor: '#e8f0fe',
                                            color: 'var(--primary)',
                                            padding: '4px 12px',
                                            borderRadius: '12px',
                                            fontSize: '0.8rem',
                                            fontWeight: '600'
                                        }}>
                                            {task.status}
                                        </span>
                                        <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                                            {new Date(task.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <Link href={`/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
                                        <h3 className="heading-md" style={{ marginBottom: '8px', cursor: 'pointer', color: 'var(--text)' }}>
                                            {task.title}
                                        </h3>
                                    </Link>
                                    <div style={{ color: 'var(--text-light)' }}>
                                        {task.budgetType === 'fixed' ? `${task.budgetAmount} TJS` : t('common.negotiable')} • {t('tasks.responseCountLabel', { count: task._count.responses })}
                                    </div>
                                </div>

                                <Link href={`/tasks/${task.id}`} className="btn btn-outline">
                                    {t('tasks.viewDetails')}
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
