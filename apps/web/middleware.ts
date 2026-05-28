import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// R2: Nonce-based CSP — eliminates 'unsafe-inline' for scripts
// R4: Correlation ID injected on every request for distributed tracing

export function middleware(request: NextRequest) {
    const nonce = Buffer.from(uuidv4().replace(/-/g, '')).toString('base64');
    const correlationId = uuidv4();

    const csp = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}'`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https:",
        "frame-ancestors 'none'",
    ].join('; ');

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('x-correlation-id', correlationId);

    const response = NextResponse.next({ request: { headers: requestHeaders } });

    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('X-Correlation-ID', correlationId);
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload'
    );

    return response;
}

export const config = {
    // Run on all routes except static files and Next internals
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
