'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { AnalyticsEvent, initAnalytics, track } from '@/lib/analytics';
import { AUTH_EVENT_COOKIE } from '@/lib/auth-event';

/** Send the Google/Apple sign-in the callback recorded, once. */
function trackOAuthSignIn(role: string | null) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_EVENT_COOKIE}=([^;]+)`));
    if (!match) return;
    document.cookie = `${AUTH_EVENT_COOKIE}=; max-age=0; path=/`;
    const [event, method] = match[1].split('.');
    if (event !== AnalyticsEvent.SignUpCompleted && event !== AnalyticsEvent.LoginCompleted) return;
    track(event, { method, role: role ?? undefined });
}

/**
 * Product analytics (PostHog), the web half of what apps/mobile/lib/analytics.ts does.
 * Off unless NEXT_PUBLIC_POSTHOG_KEY is set (see lib/analytics.ts).
 */
export default function Analytics({ userId, role }: { userId: string | null; role: string | null }) {
    useEffect(() => {
        if (!initAnalytics()) return;
        // Same id and trait as the app, so web and app visits are one person.
        if (userId) {
            posthog.identify(userId, { role });
            trackOAuthSignIn(role);
        } else if (posthog.get_property('$user_state') === 'identified') posthog.reset();
    }, [userId, role]);

    return null;
}
