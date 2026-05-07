/**
 * Logging utility
 * Replaces console.log with proper logging levels
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    data?: any;
}

class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development';

    private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
        return {
            level,
            message,
            timestamp: new Date().toISOString(),
            ...(data && { data })
        };
    }

    private log(level: LogLevel, message: string, data?: any) {
        const entry = this.formatMessage(level, message, data);

        if (this.isDevelopment) {
            // In development, use console with colors
            const colors: Record<LogLevel, string> = {
                info: '\x1b[36m', // Cyan
                warn: '\x1b[33m', // Yellow
                error: '\x1b[31m', // Red
                debug: '\x1b[90m' // Gray
            };
            const reset = '\x1b[0m';
            console.log(`${colors[level]}[${level.toUpperCase()}]${reset} ${entry.timestamp} - ${message}`, data || '');
        } else {
            // In production, you would send to logging service
            // Example: Sentry, LogRocket, CloudWatch, etc.
            if (level === 'error') {
                // Only log errors in production
                console.error(JSON.stringify(entry));
            }
        }
    }

    info(message: string, data?: any) {
        this.log('info', message, data);
    }

    warn(message: string, data?: any) {
        this.log('warn', message, data);
    }

    error(message: string, data?: any) {
        this.log('error', message, data);
    }

    debug(message: string, data?: any) {
        if (this.isDevelopment) {
            this.log('debug', message, data);
        }
    }
}

export const logger = new Logger();
