import posthog from 'posthog-js';

/**
 * Product analytics (PostHog) on the website. Event and property names match
 * apps/mobile/lib/analytics.ts, so one funnel covers both; web events also
 * carry `platform: 'web'`. Client-side only.
 */
export const AnalyticsEvent = {
    SignUpCompleted: 'sign_up_completed',
    LoginCompleted: 'login_completed',
    TaskCreateStarted: 'task_create_started',
    TaskCreateCompleted: 'task_create_completed',
    TaskCreateValidationFailed: 'task_create_validation_failed',
    ResponseSubmitted: 'response_submitted',
} as const;

/**
 * Start PostHog once. False when NEXT_PUBLIC_POSTHOG_KEY is unset (local dev,
 * e2e), and then nothing is ever sent. Events go to /ingest on our own domain
 * (rewritten to PostHog in next.config.ts), which keeps the CSP at 'self' and
 * survives most ad blockers.
 */
export function initAnalytics(): boolean {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return false;
    if (!posthog.__loaded) {
        posthog.init(key, {
            api_host: '/ingest',
            ui_host: 'https://us.posthog.com',
            defaults: '2025-05-24', // includes pageviews on client-side navigation
            person_profiles: 'identified_only',
        });
        posthog.register({ platform: 'web' });
    }
    return true;
}

/**
 * Starts PostHog itself: a page's own effects run before the layout's
 * <Analytics>. Pass `leavingPage` when a full page load follows at once, or the
 * event is lost with the page's queue.
 */
export function track(
    event: string,
    props?: Record<string, string | number | undefined>,
    { leavingPage = false }: { leavingPage?: boolean } = {},
): void {
    try {
        if (!initAnalytics()) return;
        posthog.capture(event, props, leavingPage ? { send_instantly: true, transport: 'sendBeacon' } : undefined);
    } catch {
        // Analytics must never break the page.
    }
}
