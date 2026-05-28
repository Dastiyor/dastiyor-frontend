/**
 * Distributed rate limiter using Upstash Redis.
 * Falls back to an in-memory store when UPSTASH_REDIS_REST_URL is not set
 * (local dev / CI). In production on Vercel serverless, only the Redis
 * path enforces limits across all instances.
 *
 * Required env vars (Upstash console → REST API):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ─── Limit configs ───────────────────────────────────────────────────────────

export const RATE_LIMITS = {
    auth:      { requests: 5,   windowMs: 60 * 1000 },          // 5/min  — login, register, OTP
    api:       { requests: 100, windowMs: 60 * 1000 },           // 100/min — general
    responses: { requests: 10,  windowMs: 60 * 1000 },           // 10/min — provider responses
    upload:    { requests: 20,  windowMs: 60 * 1000 },           // 20/min — file uploads
    sms:       { requests: 3,   windowMs: 15 * 60 * 1000 },      // 3/15min — SMS OTP
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

// ─── Upstash Redis client (lazy, only when env vars present) ─────────────────

function getRedis(): Redis | null {
    if (
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
        return new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
    return null;
}

// Cache Ratelimit instances (one per type) to avoid re-creating on every call
const limiters = new Map<RateLimitType, Ratelimit>();

function getLimiter(type: RateLimitType): Ratelimit | null {
    const redis = getRedis();
    if (!redis) return null;

    if (limiters.has(type)) return limiters.get(type)!;

    const cfg = RATE_LIMITS[type];
    const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(cfg.requests, `${cfg.windowMs}ms`),
        prefix: `rl:${type}`,
        analytics: false,
    });
    limiters.set(type, limiter);
    return limiter;
}

// ─── In-memory fallback (dev / CI) ───────────────────────────────────────────

type MemEntry = { count: number; resetTime: number };
const memStore: Record<string, MemEntry> = {};

function memRateLimit(
    identifier: string,
    type: RateLimitType
): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const cfg = RATE_LIMITS[type];
    const key = `${type}:${identifier}`;

    if (Math.random() < 0.01) {
        for (const k in memStore) {
            if (memStore[k].resetTime < now) delete memStore[k];
        }
    }

    const entry = memStore[key];
    if (!entry || now > entry.resetTime) {
        memStore[key] = { count: 1, resetTime: now + cfg.windowMs };
        return { allowed: true, remaining: cfg.requests - 1, resetIn: cfg.windowMs };
    }
    if (entry.count >= cfg.requests) {
        return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
    }
    entry.count++;
    return { allowed: true, remaining: cfg.requests - entry.count, resetIn: entry.resetTime - now };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function checkRateLimit(
    identifier: string,
    type: RateLimitType = 'api'
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const limiter = getLimiter(type);

    if (limiter) {
        const result = await limiter.limit(identifier);
        const resetIn = Math.max(0, result.reset - Date.now());
        return {
            allowed: result.success,
            remaining: result.remaining,
            resetIn,
        };
    }

    // Fallback: in-memory (dev / no Redis configured)
    return memRateLimit(identifier, type);
}

// ─── IP extraction ────────────────────────────────────────────────────────────

const IP_REGEX = /^[\d.:a-fA-F]+$/;

export function getClientIP(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const candidate = forwardedFor.split(',')[0].trim();
        if (IP_REGEX.test(candidate)) return candidate;
    }
    const realIP = request.headers.get('x-real-ip');
    if (realIP && IP_REGEX.test(realIP.trim())) return realIP.trim();
    return 'unknown';
}

// ─── Response helper ─────────────────────────────────────────────────────────

export function rateLimitExceededResponse(resetIn: number) {
    return new Response(
        JSON.stringify({
            error: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(resetIn / 1000),
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': Math.ceil(resetIn / 1000).toString(),
            },
        }
    );
}
