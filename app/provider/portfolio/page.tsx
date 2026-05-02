import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
// import PortfolioGallery from '@/components/provider/PortfolioGallery';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function ProviderPortfolioPage() {
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

    if (!user || user.role !== 'PROVIDER') {
        redirect('/access-denied');
    }

    const { t } = await getServerTranslation();

    // Get completed tasks with images as portfolio items
    const completedTasks = await prisma.task.findMany({
        where: {
            assignedUserId: user.id,
            status: 'COMPLETED',
            images: { not: null }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
            id: true,
            title: true,
            category: true,
            images: true,
            updatedAt: true
        }
    });

    // Parse images from completed tasks
    const portfolioItems = completedTasks
        .filter(task => task.images)
        .flatMap(task => {
            try {
                const images = JSON.parse(task.images!);
                return Array.isArray(images) ? images.map((img: string) => ({
                    id: `${task.id}-${img}`,
                    url: img,
                    taskTitle: task.title,
                    category: task.category,
                    completedAt: task.updatedAt
                })) : [];
            } catch {
                return [];
            }
        });

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container" style={{ maxWidth: '1200px' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 className="heading-lg">{t('provider.portfolio')}</h1>
                    <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>
                        {t('provider.uploadPhotosDesc')}
                    </p>
                </div>

                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', border: '1px solid var(--border)', marginBottom: '32px' }}>
                    <h2 className="heading-md" style={{ marginBottom: '16px' }}>{t('provider.uploadPhotos')}</h2>
                    <p style={{ color: 'var(--text-light)', marginBottom: '24px', fontSize: '0.95rem' }}>
                        {t('provider.uploadPhotosDesc')}
                    </p>
                    {/* <PortfolioGallery userId={user.id} initialItems={portfolioItems} /> */}
                    <div className="p-4 border border-dashed rounded-lg text-center text-gray-500">
                        Portfolio Gallery Component Missing
                    </div>
                </div>

                {/* Portfolio from completed tasks */}
                {portfolioItems.length > 0 && (
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', border: '1px solid var(--border)' }}>
                        <h2 className="heading-md" style={{ marginBottom: '24px' }}>{t('provider.photosFromTasks')}</h2>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '16px'
                        }}>
                            {portfolioItems.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        position: 'relative',
                                        aspectRatio: '1',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        border: '1px solid var(--border)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <img
                                        src={item.url}
                                        alt={item.taskTitle}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                                        padding: '12px',
                                        color: 'white',
                                        fontSize: '0.85rem'
                                    }}>
                                        <div style={{ fontWeight: '600' }}>{item.taskTitle}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>{item.category}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {portfolioItems.length === 0 && (
                    <div style={{
                        backgroundColor: 'white',
                        padding: '60px',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        textAlign: 'center'
                    }}>
                        <ImageIcon size={48} color="#9CA3AF" style={{ marginBottom: '16px' }} />
                        <h3 className="heading-md" style={{ marginBottom: '8px' }}>{t('provider.portfolioEmpty')}</h3>
                        <p style={{ color: 'var(--text-light)', marginBottom: '24px' }}>
                            {t('provider.portfolioEmptyDesc')}
                        </p>
                        <Link href="/tasks" className="btn btn-primary">
                            {t('tasks.findTitle')}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
