// Input validation and sanitization utilities
import { TASK_DESCRIPTION_MAX, TASK_TITLE_MAX, TASK_TITLE_MIN } from './task-rules';

/**
 * Phone-only signups have no email, so registration mints
 * `phone_992XXXXXXXXX@<this domain>`. Nothing can be delivered there — anything
 * that mails a user has to check for it first. Shared so the address that gets
 * written and the checks that read it cannot drift apart.
 */
export const PLACEHOLDER_EMAIL_DOMAIN = '@phone.dastiyor.local';

/** Upper bound for any money field, well under INT32_MAX so the Int columns cannot overflow. */
export const MAX_MONEY_TJS = 10_000_000;

export function isPlaceholderEmail(email: string | null | undefined): boolean {
    return Boolean(email?.endsWith(PLACEHOLDER_EMAIL_DOMAIN));
}

// Email validation
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Phone number validation (Tajikistan format)
// Accepts +992XXXXXXXXX, 992XXXXXXXXX, or 9-digit local number (XXXXXXXXX)
export function isValidPhone(phone: string): boolean {
    const stripped = phone.replace(/[\s\-()]/g, '');
    return /^\+?992[0-9]{9}$/.test(stripped) || /^[0-9]{9}$/.test(stripped);
}

// Normalize phone to E.164 (+992XXXXXXXXX)
export function normalizePhone(phone: string): string {
    const stripped = phone.replace(/[\s\-()]/g, '');
    if (stripped.startsWith('+')) return stripped;
    if (stripped.startsWith('992')) return `+${stripped}`;
    return `+992${stripped}`;
}

export const PASSWORD_MIN = 8;
/** bcrypt reads only the first 72 bytes, so longer passwords would be silently cut. */
export const PASSWORD_MAX = 70;

/**
 * The password rule: 8 to 70 characters, nothing else. Since Nov 2026 there is
 * no uppercase/lowercase/digit requirement -- people were giving up at signup
 * over it. `feedback` lists what is wrong (empty when `isStrong`), in the API's
 * Russian, so the form under the field and the server error read the same.
 */
export function checkPasswordStrength(password: string): {
    isStrong: boolean;
    feedback: string[];
} {
    const feedback: string[] = [];
    if (password.length < PASSWORD_MIN) {
        feedback.push('Пароль должен содержать минимум 8 символов');
    } else if (password.length > PASSWORD_MAX) {
        feedback.push('Пароль не должен превышать 70 символов');
    }
    return { isStrong: feedback.length === 0, feedback };
}

/** Validate password for registration, reset and change: 8 to 70 characters. */
export function validatePassword(password: string): { valid: boolean; error?: string } {
    const { isStrong, feedback } = checkPasswordStrength(password ?? '');
    return isStrong ? { valid: true } : { valid: false, error: feedback[0] };
}

// Sanitize string to prevent XSS
/**
 * Normalize user text for storage.
 *
 * This used to HTML-escape, which was the wrong layer: every consumer already
 * escapes at output -- React and React Native escape text nodes, and the email
 * templates run values through esc() -- so the entities were applied twice and
 * users saw `&quot;` and `&#x27;` in their own messages and task titles.
 * Escaping belongs at output, where the target syntax is known; storage keeps
 * what the user actually typed.
 *
 * Control characters are stripped because they serve no purpose in these
 * fields and break rendering and logs.
 */
/**
 * Request-body identifiers must be strings.
 *
 * A falsiness check alone is not enough: an object like `{"contains":"c"}` is
 * truthy, so it passes and reaches Prisma, which rejects it as a malformed
 * filter and surfaces a 500. Prisma never matches on it, so this is a crash
 * rather than an injection -- but a client type-mismatch should be a 400.
 */
export function isValidId(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= 64;
}

export function sanitizeString(input: string): string {
    // eslint-disable-next-line no-control-regex
    return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}


// Validate and sanitize task input
/**
 * Canonical enum values. These columns are plain strings in Postgres, so
 * whatever reaches prisma.create is what gets stored -- a display label like
 * 'Срочно' written into `urgency` renders untranslated in every locale and
 * misses the colour map. Whitelist at the write boundary.
 */
export const URGENCY_VALUES = ['low', 'normal', 'urgent'] as const;

export function validateTaskInput(data: {
    title?: string;
    description?: string;
    category?: string;
    city?: string;
    budgetAmount?: string;
    /** 'fixed' needs an amount above 0. Anything else (or absent: legacy clients) does not. */
    budgetType?: string;
    urgency?: string;
    allowedCategories?: readonly string[];
    allowedCities?: readonly string[];
}): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Limits shared with the create form (lib/task-rules.ts); the messages are API strings.
    if (!data.title || data.title.trim().length < TASK_TITLE_MIN) {
        errors.push('Заголовок должен содержать минимум 5 символов');
    } else if (data.title.trim().length > TASK_TITLE_MAX) {
        errors.push('Заголовок не должен превышать 200 символов');
    }

    // Optional: a title alone is a task. Customers were giving up at the 20-character minimum.
    if (typeof data.description === 'string' && data.description.trim().length > TASK_DESCRIPTION_MAX) {
        errors.push('Описание не должно превышать 5000 символов');
    }

    if (!data.category) {
        errors.push('Выберите категорию');
    } else if (data.allowedCategories && !data.allowedCategories.includes(data.category)) {
        errors.push('Неизвестная категория');
    }

    if (!data.city) {
        errors.push('Укажите город');
    } else if (data.allowedCities && !data.allowedCities.includes(data.city)) {
        errors.push('Неизвестный город');
    }

    if (data.urgency && !URGENCY_VALUES.includes(data.urgency as typeof URGENCY_VALUES[number])) {
        errors.push('Неизвестная срочность');
    }

    // Same order as taskFieldErrors() in lib/task-rules.ts: a missing (or 0) amount on a
    // fixed price asks for one; a negative or non-numeric one is reported as invalid.
    const amountText = String(data.budgetAmount ?? '').trim();
    if (data.budgetType === 'fixed' && (amountText === '' || Number(amountText) === 0)) {
        errors.push('Укажите сумму бюджета');
    } else if (data.budgetAmount) {
        const budget = parseFloat(data.budgetAmount);
        if (isNaN(budget) || budget < 0) {
            errors.push('Бюджет должен быть положительным числом');
        } else if (budget > MAX_MONEY_TJS) {
            errors.push('Бюджет не может превышать 10,000,000');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Validate response/offer input
export function validateResponseInput(data: {
    message?: string;
    price?: string;
}): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.message || data.message.trim().length < 10) {
        errors.push('Сообщение должно содержать минимум 10 символов');
    }

    if (!data.price) {
        errors.push('Укажите цену');
    } else {
        const price = parseFloat(data.price);
        if (isNaN(price) || price <= 0) {
            errors.push('Цена должна быть положительным числом');
        } else if (price > MAX_MONEY_TJS) {
            // Same ceiling as a task budget. Without it, anything past INT32_MAX
            // overflowed the Postgres Int column and surfaced as a bare 500.
            errors.push('Цена не может превышать 10,000,000');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Check for spam patterns
export function detectSpam(text: string): boolean {
    const spamPatterns = [
        /(.)\1{10,}/i,             // Excessive repeated characters (10+)
        /(free|win|prize|lottery)/i, // High-value bait keywords
        /click here/i,             // Classic call-to-action spam phrase
        // Note: URLs are intentionally NOT included — task descriptions legitimately reference sites
    ];

    let matches = 0;
    for (const pattern of spamPatterns) {
        if (pattern.test(text)) {
            matches++;
        }
    }

    // Require 2+ distinct pattern matches to reduce false positives
    return matches >= 2;
}

// Validate file type for uploads
export function isValidImageType(mimeType: string): boolean {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ];
    return allowedTypes.includes(mimeType);
}

// Validate file size (in bytes)
export function isValidFileSize(size: number, maxSizeMB: number = 5): boolean {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return size <= maxBytes;
}
