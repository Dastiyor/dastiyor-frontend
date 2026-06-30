/**
 * Environment variable validation
 * Validates required environment variables on startup
 */

const KNOWN_WEAK_SECRETS = new Set([
    'your-super-secret-jwt-key-change-this-in-production',
    'development-secret-key',
    'secret',
    'jwt-secret',
    'changeme',
]);

interface EnvConfig {
    POSTGRES_PRISMA_URL: string;
    JWT_SECRET: string;
    NODE_ENV: 'development' | 'production' | 'test';
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    NEXT_PUBLIC_APP_URL: string;
}

const requiredEnvVars: (keyof EnvConfig)[] = ['POSTGRES_PRISMA_URL', 'JWT_SECRET', 'NODE_ENV'];

const optionalButWarn: { key: string; label: string }[] = [
    { key: 'GOOGLE_CLIENT_ID', label: 'Google OAuth' },
    { key: 'GOOGLE_CLIENT_SECRET', label: 'Google OAuth' },
    { key: 'NEXT_PUBLIC_APP_URL', label: 'App URL (used for absolute links and OAuth redirect URIs)' },
];

export function validateEnv(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required variables
    for (const key of requiredEnvVars) {
        if (!process.env[key]) {
            errors.push(`Missing required environment variable: ${key}`);
        }
    }

    // Validate JWT_SECRET strength
    if (process.env.JWT_SECRET) {
        if (process.env.JWT_SECRET.length < 64) {
            errors.push('JWT_SECRET must be at least 64 characters long');
        }
        if (KNOWN_WEAK_SECRETS.has(process.env.JWT_SECRET)) {
            errors.push('JWT_SECRET must be changed from the default/example value');
        }
    }

    // Validate POSTGRES_PRISMA_URL format
    if (process.env.POSTGRES_PRISMA_URL) {
        const dbUrl = process.env.POSTGRES_PRISMA_URL;
        if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
            errors.push('POSTGRES_PRISMA_URL must start with postgresql:// or postgres://');
        }
    }

    // Warn about optional but recommended variables
    for (const { key, label } of optionalButWarn) {
        if (!process.env[key]) {
            console.warn(`[env-validation] ${key} (${label}) is not set. Related functionality will be unavailable.`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validate on import (for server-side)
if (typeof window === 'undefined') {
    const validation = validateEnv();
    if (!validation.isValid) {
        console.error('Environment validation failed:');
        validation.errors.forEach(error => console.error(`  - ${error}`));
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Environment validation failed. Please fix the errors above.');
        }
    }
}
