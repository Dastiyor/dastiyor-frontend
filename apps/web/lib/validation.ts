// Input validation and sanitization utilities

// Email validation
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Phone number validation (Tajikistan format)
export function isValidPhone(phone: string): boolean {
    // Accepts formats: +992XXXXXXXXX, 992XXXXXXXXX, or just 9 digits
    const phoneRegex = /^(\+?992)?[0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
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
        return { valid: false, error: 'Password must be at least 8 characters' };
    }
    if (password.length > 70) {
        return { valid: false, error: 'Password must not exceed 70 characters' };
    }
    const { isStrong, feedback } = checkPasswordStrength(password);
    if (!isStrong) {
        return { valid: false, error: 'Use at least one uppercase letter, one lowercase letter, and one number' };
    }
    return { valid: true };
}

// Sanitize string to prevent XSS
export function sanitizeString(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

// Validate and sanitize task input
export function validateTaskInput(data: {
    title?: string;
    description?: string;
    category?: string;
    city?: string;
    budgetAmount?: string;
}): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length < 5) {
        errors.push('Заголовок должен содержать минимум 5 символов');
    }

    if (!data.description || data.description.trim().length < 20) {
        errors.push('Описание должно содержать минимум 20 символов');
    }

    if (!data.category) {
        errors.push('Выберите категорию');
    }

    if (!data.city) {
        errors.push('Укажите город');
    }

    if (data.budgetAmount) {
        const budget = parseFloat(data.budgetAmount);
        if (isNaN(budget) || budget < 0) {
            errors.push('Бюджет должен быть положительным числом');
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
        /(.)\1{10,}/i, // Repeated characters
        /https?:\/\/[^\s]+/gi, // URLs (might be spam)
        /(free|win|prize|lottery|click here)/i, // Common spam words
        /\+\d{10,}/g, // Phone numbers in text (could be spam)
    ];

    // Check if too many matches
    let matches = 0;
    for (const pattern of spamPatterns) {
        if (pattern.test(text)) {
            matches++;
        }
    }

    // If 2+ spam patterns match, likely spam
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
