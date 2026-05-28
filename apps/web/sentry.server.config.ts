import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: !!process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Attach correlation ID from middleware as a tag on every event
    beforeSend(event, hint) {
        const req = hint?.originalException as any;
        if (req?.correlationId) {
            event.tags = { ...event.tags, correlation_id: req.correlationId };
        }
        return event;
    },
});
