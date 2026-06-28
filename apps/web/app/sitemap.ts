import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';

const BASE_URL = 'https://dastiyor.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    const staticPages: MetadataRoute.Sitemap = [
        { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
        { url: `${BASE_URL}/tasks`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
        { url: `${BASE_URL}/how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${BASE_URL}/professionals`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
        // Subscriptions are temporarily hidden — see lib/features.ts
        ...(SUBSCRIPTIONS_ENABLED
            ? [{ url: `${BASE_URL}/contractor-plans`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 }]
            : []),
        { url: `${BASE_URL}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
        { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
        { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
        { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
        { url: `${BASE_URL}/mobile-app`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
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
            url: `${BASE_URL}/tasks/${task.id}`,
            lastModified: task.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }));
    } catch {
        // If DB is unavailable at build time, degrade gracefully with static pages only
    }

    // Dynamic: provider profiles
    let providerPages: MetadataRoute.Sitemap = [];
    try {
        const providers = await prisma.user.findMany({
            where: { role: 'PROVIDER', isVerified: true },
            select: { id: true, updatedAt: true },
            take: 500,
        });
        providerPages = providers.map(p => ({
            url: `${BASE_URL}/professionals/${p.id}`,
            lastModified: p.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.6,
        }));
    } catch {
        // Degrade gracefully
    }

    return [...staticPages, ...taskPages, ...providerPages];
}
