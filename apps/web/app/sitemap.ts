import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';
import { SITE_URL } from '@/lib/site-url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    const staticPages: MetadataRoute.Sitemap = [
        { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
        { url: `${SITE_URL}/tasks`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
        { url: `${SITE_URL}/how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${SITE_URL}/professionals`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
        // Subscriptions are temporarily hidden — see lib/features.ts
        ...(SUBSCRIPTIONS_ENABLED
            ? [{ url: `${SITE_URL}/subscription`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 }]
            : []),
        { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
        { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
        { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
        { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
        { url: `${SITE_URL}/mobile-app`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    ];

    // Dynamic: open tasks — high SEO value
    let taskPages: MetadataRoute.Sitemap = [];
    try {
        const tasks = await prisma.task.findMany({
            where: { status: 'OPEN' },
            select: { id: true, updatedAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1000,
        });
        taskPages = tasks.map(task => ({
            url: `${SITE_URL}/tasks/${task.id}`,
            lastModified: task.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }));
    } catch {
        // If DB is unavailable at build time, degrade gracefully with static pages only
    }

    return [...staticPages, ...taskPages];
}
