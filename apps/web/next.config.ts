import type { NextConfig } from "next";

// Security headers and CSP are now set in middleware.ts (nonce-based CSP).
// next.config.ts only keeps non-security response headers here.

const nextConfig: NextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
    async redirects() {
        return [
            { source: '/categories', destination: '/tasks', permanent: false },
        ];
    },
};

export default nextConfig;
