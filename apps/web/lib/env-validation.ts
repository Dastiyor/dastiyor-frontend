/**
 * Environment variable validation
 * Validates required environment variables on startup
 */

interface EnvConfig {
    DATABASE_URL: string;
    JWT_SECRET: string;
    NODE_ENV: 'development' | 'production' | 'test';
}

const requiredEnvVars: (keyof EnvConfig)[] = ['DATABASE_URL', 'JWT_SECRET', 'NODE_ENV'];

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
        if (process.env.JWT_SECRET.length < 32) {
            errors.push('JWT_SECRET must be at least 32 characters long');
        }
        if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
            errors.push('JWT_SECRET must be changed from default value in production');
        }
    }

    // Validate DATABASE_URL format
    if (process.env.DATABASE_URL) {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl.startsWith('file:') && !dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('mysql://')) {
            errors.push('DATABASE_URL must start with file:, postgresql://, or mysql://');
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
