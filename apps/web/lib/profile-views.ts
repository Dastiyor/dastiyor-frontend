/**
 * Profile views for provider analytics.
 *
 * A view is recorded when someone opens a provider's public profile: the web
 * page app/(public)/provider/[id] or GET /api/users/[id], which the mobile app
 * uses. Recording runs in `after()`, once the response has been sent, and every
 * failure is swallowed: it must never slow down or break the profile.
 *
 * Privacy: no IP address, user agent or referrer is stored. A repeat view is
 * recognised by `dedupeKey`, a one-way HMAC of (provider, viewer, 6-hour window)
 * keyed with a salt derived for that UTC day. The viewer is the signed-in user
 * id, or for anonymous visitors their IP + user agent, which only ever exist in
 * memory inside that hash. The column is unique, so a second view in the same
 * window is dropped by the insert itself (skipDuplicates).
 *
 * Server-only: imports Prisma and next/headers.
 */
import { createHmac } from 'crypto';
import { after } from 'next/server';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getBearerToken, verifyJWT } from '@/lib/auth';
import { getCategories } from '@/lib/categories';
import { CITIES } from '@/lib/config-fallback';
import { getClientIP } from '@/lib/rate-limit';

/** Views by the same viewer within one window count once. */
export const VIEW_WINDOW_HOURS = 6;

export type ViewSource = 'DIRECTORY' | 'TASK' | 'SEARCH' | 'DIRECT';
export type ViewPlatform = 'WEB' | 'APP';

export interface ViewContext {
    source: ViewSource;
    taskId?: string | null;
    category?: string | null;
    city?: string | null;
}

export interface ViewInput extends ViewContext {
    providerId: string;
    viewerId: string | null;
    /** Anonymous visitor fingerprint (IP + user agent). Hashed, never stored. */
    visitor: string;
    platform: ViewPlatform;
    now?: Date;
}

// Crawlers, link-preview fetchers, headless browsers and scripts. Deliberately
// not matching okhttp (Android) or CFNetwork (iOS): those are the app itself.
const BOT_RE = /bot|crawl|spider|slurp|scrap|preview|facebookexternalhit|embedly|whatsapp|vkshare|headless|lighthouse|pagespeed|phantom|python|curl|wget|go-http|java\/|httpclient|axios|node-fetch|postman|insomnia/i;

/** A crawler or script, or no user agent at all. */
export function isBot(userAgent: string | null): boolean {
    return !userAgent || BOT_RE.test(userAgent);
}

/** Next.js router and browser speculative loads: nobody has seen the page. */
export function isPrefetch(h: Headers): boolean {
    if (h.get('next-router-prefetch')) return true;
    if (h.get('purpose') === 'prefetch') return true;
    return /prefetch|prerender/i.test(h.get('sec-purpose') ?? '');
}

const SEARCH_ENGINE_RE = /(^|\.)(google|yandex|bing|duckduckgo|yahoo|baidu|ecosia|search\.brave|go\.mail)\./i;
const TASK_PATH_RE = /^\/(?:provider\/|customer\/)?tasks\/([^/]+)/;

/** Where a web view came from, read from the Referer. */
export function classifyReferer(referer: string | null, host: string | null): ViewContext {
    if (!referer) return { source: 'DIRECT' };
    let url: URL;
    try {
        url = new URL(referer);
    } catch {
        return { source: 'DIRECT' };
    }
    if (SEARCH_ENGINE_RE.test(url.hostname)) return { source: 'SEARCH' };

    const ours = url.host === host || url.hostname === 'dastiyor.com' || url.hostname.endsWith('.dastiyor.com');
    if (!ours) return { source: 'DIRECT' };

    if (url.pathname === '/professionals' || url.pathname.startsWith('/professionals/')) {
        const q = url.searchParams.get('q')?.trim();
        return {
            source: q ? 'SEARCH' : 'DIRECTORY',
            category: url.searchParams.get('category') || null,
            city: url.searchParams.get('city') || null,
        };
    }
    const task = TASK_PATH_RE.exec(url.pathname);
    if (task) return { source: 'TASK', taskId: decodeURIComponent(task[1]) };
    return { source: 'DIRECT' };
}

const APP_SOURCES: Record<string, ViewSource> = { directory: 'DIRECTORY', task: 'TASK', search: 'SEARCH', direct: 'DIRECT' };

/**
 * Where an app view came from: the app adds ?src=directory|task|search (and
 * taskId, category, city) to /api/users/[id]. Builds that predate it send
 * nothing, which counts as direct.
 */
export function classifyAppParams(params: URLSearchParams): ViewContext {
    const source = APP_SOURCES[params.get('src') ?? ''] ?? 'DIRECT';
    return {
        source,
        taskId: source === 'TASK' ? params.get('taskId') || null : null,
        category: params.get('category') || null,
        city: params.get('city') || null,
    };
}

/** IP + user agent, only ever used inside dedupeKey's hash. */
function visitorOf(h: Headers): string {
    return `${getClientIP({ headers: h } as Request)}|${h.get('user-agent')}`;
}

function dailySalt(day: string): Buffer {
    return createHmac('sha256', process.env.JWT_SECRET ?? '').update(`profile-view:${day}`).digest();
}

/** One-way key for (provider, viewer, window). Same inputs in the same window give the same key. */
export function dedupeKey(providerId: string, viewer: string, now: Date): string {
    const day = now.toISOString().slice(0, 10);
    const window = Math.floor(now.getUTCHours() / VIEW_WINDOW_HOURS);
    return createHmac('sha256', dailySalt(day)).update(`${providerId}|${viewer}|${window}`).digest('hex');
}

async function viewerFromToken(token: string | null): Promise<string | null> {
    if (!token) return null;
    const payload = await verifyJWT(token);
    return typeof payload?.id === 'string' ? payload.id : null;
}

/**
 * Insert one view unless it is the provider's own or a repeat in the window.
 * Context values are kept only when canonical. Never throws.
 */
export async function recordProfileView(input: ViewInput): Promise<boolean> {
    try {
        if (input.viewerId && input.viewerId === input.providerId) return false;
        let { category = null, city = null } = input;

        if (input.taskId) {
            const task = await prisma.task.findUnique({ where: { id: input.taskId }, select: { category: true, city: true } });
            if (task) ({ category, city } = task);
        } else if (category && !(await getCategories()).includes(category)) {
            category = null;
        }
        if (city && !CITIES.includes(city)) city = null;

        const now = input.now ?? new Date();
        const viewer = input.viewerId ? `u:${input.viewerId}` : `a:${input.visitor}`;
        const { count } = await prisma.profileView.createMany({
            data: [{
                providerId: input.providerId,
                viewerId: input.viewerId,
                source: input.source,
                platform: input.platform,
                category,
                city,
                dedupeKey: dedupeKey(input.providerId, viewer, now),
                createdAt: now,
            }],
            skipDuplicates: true,
        });
        return count > 0;
    } catch (err) {
        console.error('[profile-views] record failed:', err);
        return false;
    }
}

/** Web profile page: call during render. Reads the request, records after the response. */
export async function trackProfilePageView(providerId: string): Promise<void> {
    try {
        const h = await headers();
        if (isPrefetch(h) || isBot(h.get('user-agent'))) return;
        const token = (await cookies()).get('token')?.value ?? null;
        const context = classifyReferer(h.get('referer'), h.get('host'));
        const visitor = visitorOf(h);
        after(async () => {
            const viewerId = await viewerFromToken(token);
            await recordProfileView({ ...context, providerId, viewerId, visitor, platform: 'WEB' });
        });
    } catch (err) {
        console.error('[profile-views] track failed:', err);
    }
}

/** GET /api/users/[id] (the app): records after the response. */
export function trackProfileApiView(request: Request, providerId: string): void {
    try {
        const h = request.headers;
        if (isBot(h.get('user-agent'))) return;
        const token = getBearerToken(request);
        const context = classifyAppParams(new URL(request.url).searchParams);
        const visitor = visitorOf(h);
        after(async () => {
            const viewerId = await viewerFromToken(token);
            await recordProfileView({ ...context, providerId, viewerId, visitor, platform: 'APP' });
        });
    } catch (err) {
        console.error('[profile-views] track failed:', err);
    }
}
