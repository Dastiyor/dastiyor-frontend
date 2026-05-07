import { MetadataRoute } from 'next';

const BASE_URL = 'https://dastiyor.com';

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    return [
        { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
        { url: `${BASE_URL}/tasks`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
        { url: `${BASE_URL}/how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${BASE_URL}/professionals`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
        { url: `${BASE_URL}/contractor-plans`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${BASE_URL}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
        { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
        { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
        { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
        { url: `${BASE_URL}/mobile-app`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    ];
}
