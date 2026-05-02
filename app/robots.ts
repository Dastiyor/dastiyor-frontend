import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/admin/', '/customer/', '/provider/'],
            },
        ],
        sitemap: 'https://dastiyor.com/sitemap.xml',
    };
}
