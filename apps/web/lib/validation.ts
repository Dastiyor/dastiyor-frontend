// Input validation and sanitization utilities

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

// Password strength check
export function checkPasswordStrength(password: string): {
    isStrong: boolean;
    score: number;
    feedback: string[];
} {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
        score += 1;
    } else {
        feedback.push('Пароль должен содержать минимум 8 символов');
    }

    if (/[A-Z]/.test(password)) {
        score += 1;
    } else {
        feedback.push('Добавьте заглавную букву');
    }

    if (/[a-z]/.test(password)) {
        score += 1;
    } else {
        feedback.push('Добавьте строчную букву');
    }

    if (/[0-9]/.test(password)) {
        score += 1;
    } else {
        feedback.push('Добавьте цифру');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
        score += 1;
    }

    return {
        isStrong: score >= 3,
        score,
        feedback
    };
}

/** Validate password for registration and reset: min 8 chars, at least one letter and one number. */
export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < 8) {
        return { valid: false, error: 'Пароль должен содержать минимум 8 символов' };
    }
    if (password.length > 70) {
        return { valid: false, error: 'Пароль не должен превышать 70 символов' };
    }
    // Reuse the per-rule feedback rather than a second wording of the same rules.
    const { isStrong, feedback } = checkPasswordStrength(password);
    if (!isStrong) {
        return { valid: false, error: feedback.join('. ') };
    }
    return { valid: true };
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
    urgency?: string;
    allowedCategories?: readonly string[];
    allowedCities?: readonly string[];
}): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length < 5) {
        errors.push('Заголовок должен содержать минимум 5 символов');
    } else if (data.title.trim().length > 200) {
        errors.push('Заголовок не должен превышать 200 символов');
    }

    if (!data.description || data.description.trim().length < 20) {
        errors.push('Описание должно содержать минимум 20 символов');
    } else if (data.description.trim().length > 5000) {
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

    if (data.budgetAmount) {
        const budget = parseFloat(data.budgetAmount);
        if (isNaN(budget) || budget < 0) {
            errors.push('Бюджет должен быть положительным числом');
        } else if (budget > 10_000_000) {
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
