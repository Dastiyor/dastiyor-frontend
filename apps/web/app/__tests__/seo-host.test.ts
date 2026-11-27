/**
 * @jest-environment node
 */
import robots from '../robots';
import sitemap from '../sitemap';

jest.mock('@/lib/prisma', () => ({
    prisma: { task: { findMany: async () => [{ id: 't1', updatedAt: new Date() }] } },
}));

it('points robots and every sitemap entry at the www host', async () => {
    expect(robots().sitemap).toBe('https://www.dastiyor.com/sitemap.xml');
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain('https://www.dastiyor.com/tasks/t1');
    for (const url of urls) expect(url).toMatch(/^https:\/\/www\.dastiyor\.com(\/|$)/);
    // There is no page at /professionals/<id>.
    expect(urls.filter((url) => url.includes('/professionals/'))).toEqual([]);
});
