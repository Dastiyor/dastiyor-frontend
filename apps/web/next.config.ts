import type { NextConfig } from "next";

// Security headers and CSP are now set in middleware.ts (nonce-based CSP).
// next.config.ts only keeps non-security response headers here.

const nextConfig: NextConfig = {
    // PostHog's API paths end in a slash; don't redirect them away from it.
    skipTrailingSlashRedirect: true,
    experimental: {
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
    // PostHog through our own domain (see components/Analytics.tsx).
    async rewrites() {
        return [
            { source: '/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
            { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
        ];
    },
    async redirects() {
        return [
            { source: '/categories', destination: '/tasks', permanent: false },
        ];
    },
};

export default nextConfig;
