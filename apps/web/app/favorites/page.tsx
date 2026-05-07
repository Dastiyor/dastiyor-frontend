import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import TaskCard from '@/components/tasks/TaskCard';
import { Heart } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function FavoritesPage() {
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

    const favorites = await prisma.taskFavorite.findMany({
        where: { userId: payload.id as string },
        include: {
            task: {
                include: {
                    _count: {
                        select: { responses: true }
                    },
                    user: {
                        select: { fullName: true }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container" style={{ maxWidth: '1200px' }}>
                <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', marginTop: '-2px' }} aria-hidden>
                        <Heart size={28} color="#EF4444" fill="#EF4444" />
                    </span>
                    <div>
                        <h1 className="heading-lg" style={{ margin: 0 }}>{t('favorites.title')}</h1>
                        <p style={{ color: 'var(--text-light)', marginTop: '4px' }}>
                            {t('favorites.subtitle')}
                        </p>
                    </div>
                </div>

                {favorites.length === 0 ? (
                    <div style={{
                        backgroundColor: 'white',
                        padding: '60px',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>❤️</div>
                        <h3 className="heading-md" style={{ marginBottom: '8px' }}>{t('favorites.empty')}</h3>
                        <p style={{ color: 'var(--text-light)', marginBottom: '24px' }}>
                            {t('favorites.emptyDesc')}
                        </p>
                        <Link href="/tasks" className="btn btn-primary">
                            {t('tasks.findTitle')}
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {favorites.map((fav) => (
                            <TaskCard
                                key={fav.task.id}
                                task={{
                                    id: fav.task.id,
                                    title: fav.task.title,
                                    category: fav.task.category,
                                    budget: fav.task.budgetType === 'fixed' ? `${fav.task.budgetAmount} с.` : t('common.negotiable'),
                                    city: fav.task.city,
                                    postedAt: new Date(fav.task.createdAt).toLocaleDateString('ru-RU'),
                                    description: fav.task.description,
                                    urgency: fav.task.urgency,
                                    responseCount: fav.task._count.responses,
                                    status: fav.task.status
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
