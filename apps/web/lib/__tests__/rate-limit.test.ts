import {
    checkRateLimit,
    getClientIP,
    rateLimitExceededResponse,
    RATE_LIMITS,
} from '../rate-limit';

describe('Rate Limit', () => {
    describe('RATE_LIMITS', () => {
        it('should define limits for auth, api, responses, upload', () => {
            expect(RATE_LIMITS.auth).toBeDefined();
            expect(RATE_LIMITS.auth.requests).toBe(5);
            expect(RATE_LIMITS.api).toBeDefined();
            expect(RATE_LIMITS.responses).toBeDefined();
            expect(RATE_LIMITS.upload).toBeDefined();
        });
    });

    describe('checkRateLimit', () => {
        it('should allow first request', () => {
            const result = checkRateLimit('unique-ip-1', 'auth');
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBeLessThanOrEqual(RATE_LIMITS.auth.requests);
            expect(result.resetIn).toBeGreaterThan(0);
        });

        it('should allow requests within limit', () => {
            const key = 'key-within-limit';
            for (let i = 0; i < RATE_LIMITS.auth.requests - 1; i++) {
                const result = checkRateLimit(key, 'auth');
                expect(result.allowed).toBe(true);
            }
        });

        it('should deny when limit exceeded for auth', () => {
            const key = 'key-auth-exceed-' + Date.now();
            for (let i = 0; i < RATE_LIMITS.auth.requests; i++) {
                checkRateLimit(key, 'auth');
            }
            const result = checkRateLimit(key, 'auth');
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
            expect(result.resetIn).toBeGreaterThan(0);
        });

        it('should use different keys per identifier', () => {
            const r1 = checkRateLimit('ip-a', 'api');
            const r2 = checkRateLimit('ip-b', 'api');
            expect(r1.allowed).toBe(true);
            expect(r2.allowed).toBe(true);
        });

        it('should use different keys per type', () => {
            const key = 'same-ip-' + Date.now();
            checkRateLimit(key, 'auth');
            const apiResult = checkRateLimit(key, 'api');
            expect(apiResult.allowed).toBe(true);
        });

        it('should default to api type when not specified', () => {
            const result = checkRateLimit('default-key', 'api');
            expect(result.allowed).toBe(true);
            expect(result.resetIn).toBe(RATE_LIMITS.api.windowMs);
        });
    });

    describe('getClientIP', () => {
        it('should return x-forwarded-for first value', () => {
            const request = new Request('http://localhost', {
                headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
            });
            expect(getClientIP(request)).toBe('192.168.1.1');
        });

        it('should return x-real-ip when x-forwarded-for is absent', () => {
            const request = new Request('http://localhost', {
                headers: { 'x-real-ip': '10.0.0.2' },
            });
            expect(getClientIP(request)).toBe('10.0.0.2');
        });

        it('should return unknown when no IP headers', () => {
            const request = new Request('http://localhost');
            expect(getClientIP(request)).toBe('unknown');
        });

        it('should trim x-forwarded-for values', () => {
            const request = new Request('http://localhost', {
                headers: { 'x-forwarded-for': '  203.0.113.1  ' },
            });
            expect(getClientIP(request)).toBe('203.0.113.1');
        });
    });

    describe('rateLimitExceededResponse', () => {
        it('should return 429 status', async () => {
            const response = rateLimitExceededResponse(60);
            expect(response.status).toBe(429);
        });

        it('should return JSON with error and code', async () => {
            const response = rateLimitExceededResponse(2000);
            const data = await response.json();
            expect(data.error).toContain('Too many requests');
            expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
            expect(data.retryAfter).toBe(2); // 2000ms -> 2 seconds
        });

        it('should set Retry-After header', () => {
            const response = rateLimitExceededResponse(90);
            expect(response.headers.get('Retry-After')).toBe('1');
        });

        it('should set Content-Type to application/json', () => {
            const response = rateLimitExceededResponse(60);
            expect(response.headers.get('Content-Type')).toContain('application/json');
        });
    });
});
