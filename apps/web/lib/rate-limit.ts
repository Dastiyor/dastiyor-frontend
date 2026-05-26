// Simple in-memory rate limiter
// In production, use Redis for distributed rate limiting

type RateLimitStore = {
    [key: string]: {
        count: number;
        resetTime: number;
    };
};

const store: RateLimitStore = {};

// Default limits per endpoint type
export const RATE_LIMITS = {
    auth: { requests: 5, windowMs: 60 * 1000 }, // 5 requests per minute for auth
    api: { requests: 100, windowMs: 60 * 1000 }, // 100 requests per minute for general API
    responses: { requests: 10, windowMs: 60 * 1000 }, // 10 responses per minute
    upload: { requests: 20, windowMs: 60 * 1000 }, // 20 uploads per minute
    sms: { requests: 3, windowMs: 15 * 60 * 1000 }, // 3 SMS per 15 minutes per identifier (IP or phone)
};

export type RateLimitType = keyof typeof RATE_LIMITS;

export function checkRateLimit(
    identifier: string,
    type: RateLimitType = 'api'
): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const limit = RATE_LIMITS[type];
    const key = `${type}:${identifier}`;

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
        cleanupExpiredEntries();
    }

    const entry = store[key];

    if (!entry || now > entry.resetTime) {
        // Create new entry
        store[key] = {
            count: 1,
            resetTime: now + limit.windowMs
        };
        return {
            allowed: true,
            remaining: limit.requests - 1,
            resetIn: limit.windowMs
        };
    }

    if (entry.count >= limit.requests) {
        // Rate limit exceeded
        return {
            allowed: false,
            remaining: 0,
            resetIn: entry.resetTime - now
        };
    }

    // Increment count
    entry.count++;
    return {
        allowed: true,
        remaining: limit.requests - entry.count,
        resetIn: entry.resetTime - now
    };
}

function cleanupExpiredEntries() {
    const now = Date.now();
    for (const key in store) {
        if (store[key].resetTime < now) {
            delete store[key];
        }
    }
}

// Helper to get client IP from request.
// On Vercel, x-forwarded-for is set by the platform and the first IP is the client.
// We validate the extracted IP looks like a real IPv4/IPv6 address to prevent
// trivial header-spoofing attacks (a spoofed IP still bypasses the rate limiter
// on serverless; migrate to Redis for distributed enforcement).
const IP_REGEX = /^[\d.:a-fA-F]+$/;

export function getClientIP(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const candidate = forwardedFor.split(',')[0].trim();
        if (IP_REGEX.test(candidate)) return candidate;
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP && IP_REGEX.test(realIP.trim())) {
        return realIP.trim();
    }

    return 'unknown';
}

// Response helper for rate limit exceeded
export function rateLimitExceededResponse(resetIn: number) {
    return new Response(
        JSON.stringify({
            error: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(resetIn / 1000)
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': Math.ceil(resetIn / 1000).toString()
            }
        }
    );
}
