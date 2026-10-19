'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

/**
 * Product analytics (PostHog), the web half of what apps/mobile/lib/analytics.ts does.
 * Off unless NEXT_PUBLIC_POSTHOG_KEY is set, so local dev and e2e runs send nothing.
 * Events go to /ingest on our own domain (rewritten to PostHog in next.config.ts),
 * which keeps the CSP at 'self' and survives most ad blockers.
 */
export default function Analytics({ userId, role }: { userId: string | null; role: string | null }) {
    useEffect(() => {
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        if (!key) return;
        if (!posthog.__loaded) {
            posthog.init(key, {
                api_host: '/ingest',
                ui_host: 'https://us.posthog.com',
                defaults: '2025-05-24', // includes pageviews on client-side navigation
                person_profiles: 'identified_only',
            });
        }
        // Same id and trait as the app, so web and app visits are one person.
        if (userId) posthog.identify(userId, { role });
        else if (posthog.get_property('$user_state') === 'identified') posthog.reset();
    }, [userId, role]);

    return null;
}
