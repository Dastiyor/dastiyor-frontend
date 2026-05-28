import * as Sentry from '@sentry/nextjs';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    data?: unknown;
}

class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development';
    private sentryEnabled = !!process.env.SENTRY_DSN;

    private formatMessage(level: LogLevel, message: string, data?: unknown): LogEntry {
        return { level, message, timestamp: new Date().toISOString(), ...(data !== undefined && { data }) };
    }

    private log(level: LogLevel, message: string, data?: unknown) {
        const entry = this.formatMessage(level, message, data);

        if (this.isDevelopment) {
            const colors: Record<LogLevel, string> = {
                info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', debug: '\x1b[90m',
            };
            console.log(`${colors[level]}[${level.toUpperCase()}]\x1b[0m ${entry.timestamp} - ${message}`, data ?? '');
        } else {
            // In production: always emit errors; emit warn/info as structured JSON
            if (level === 'error' || level === 'warn') {
                console.error(JSON.stringify(entry));
            }
        }

        // Sentry: capture errors and warnings when DSN is configured
        if (this.sentryEnabled && (level === 'error' || level === 'warn')) {
            const err = data instanceof Error ? data : new Error(message);
            Sentry.captureException(err, {
                level: level === 'error' ? 'error' : 'warning',
                extra: { message, data: data instanceof Error ? undefined : data },
            });
        }
    }

    info(message: string, data?: unknown) { this.log('info', message, data); }
    warn(message: string, data?: unknown) { this.log('warn', message, data); }
    error(message: string, data?: unknown) { this.log('error', message, data); }
    debug(message: string, data?: unknown) {
        if (this.isDevelopment) this.log('debug', message, data);
    }
}

export const logger = new Logger();
