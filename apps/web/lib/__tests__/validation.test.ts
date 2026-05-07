import {
    isValidEmail,
    isValidPhone,
    checkPasswordStrength,
    sanitizeString,
    validateTaskInput,
    validateResponseInput,
    detectSpam,
    isValidImageType,
    isValidFileSize,
} from '../validation';

describe('Validation Utilities', () => {
    describe('isValidEmail', () => {
        it('should validate correct email addresses', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(isValidEmail('user+tag@example.com')).toBe(true);
        });

        it('should reject invalid email addresses', () => {
            expect(isValidEmail('invalid-email')).toBe(false);
            expect(isValidEmail('@example.com')).toBe(false);
            expect(isValidEmail('user@')).toBe(false);
            expect(isValidEmail('')).toBe(false);
        });
    });

    describe('isValidPhone', () => {
        it('should validate Tajikistan phone numbers', () => {
            expect(isValidPhone('+992901234567')).toBe(true);
            expect(isValidPhone('992901234567')).toBe(true);
            expect(isValidPhone('901234567')).toBe(true);
        });

        it('should reject invalid phone numbers', () => {
            expect(isValidPhone('123456')).toBe(false);
            expect(isValidPhone('+1234567890')).toBe(false);
            expect(isValidPhone('')).toBe(false);
        });
    });

    describe('checkPasswordStrength', () => {
        it('should identify strong passwords', () => {
            const result = checkPasswordStrength('StrongPass123!');
            expect(result.isStrong).toBe(true);
            expect(result.score).toBeGreaterThanOrEqual(3);
        });

        it('should identify weak passwords', () => {
            const result = checkPasswordStrength('weak');
            expect(result.isStrong).toBe(false);
            expect(result.feedback.length).toBeGreaterThan(0);
        });

        it('should provide feedback for missing requirements', () => {
            const result = checkPasswordStrength('short');
            expect(result.feedback).toContain('Пароль должен содержать минимум 8 символов');
        });
    });

    describe('sanitizeString', () => {
        it('should escape HTML special characters', () => {
            expect(sanitizeString('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
            expect(sanitizeString('Hello & World')).toBe('Hello &amp; World');
        });

        it('should trim whitespace', () => {
            expect(sanitizeString('  hello  ')).toBe('hello');
        });
    });

    describe('validateTaskInput', () => {
        it('should validate correct task input', () => {
            const result = validateTaskInput({
                title: 'Test Task Title',
                description: 'This is a detailed description of the task',
                category: 'Cleaning',
                city: 'Dushanbe',
                budgetAmount: '100'
            });
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should reject invalid task input', () => {
            const result = validateTaskInput({
                title: 'Hi',
                description: 'Short',
                category: '',
                city: '',
            });
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should validate budget amount', () => {
            const result = validateTaskInput({
                title: 'Test Task',
                description: 'This is a detailed description',
                category: 'Cleaning',
                city: 'Dushanbe',
                budgetAmount: '-100'
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Бюджет должен быть положительным числом');
        });
    });

    describe('validateResponseInput', () => {
        it('should validate correct response input', () => {
            const result = validateResponseInput({
                message: 'I can help you with this task',
                price: '500'
            });
            expect(result.isValid).toBe(true);
        });

        it('should reject invalid response input', () => {
            const result = validateResponseInput({
                message: 'Short',
                price: '-100'
            });
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('detectSpam', () => {
        it('should detect spam patterns', () => {
            // Need 2+ patterns to be detected as spam
            expect(detectSpam('FREE PRIZE CLICK HERE https://spam.com')).toBe(true);
            // Repeated characters (11+ same chars) + URL = 2 patterns
            expect(detectSpam('aaaaaaaaaaaaaaaaaaaa https://spam.com')).toBe(true);
        });

        it('should not flag normal text as spam', () => {
            expect(detectSpam('Hello, I am interested in your task')).toBe(false);
            expect(detectSpam('Can we discuss the details?')).toBe(false);
        });
    });

    describe('isValidImageType', () => {
        it('should accept valid image types', () => {
            expect(isValidImageType('image/jpeg')).toBe(true);
            expect(isValidImageType('image/png')).toBe(true);
            expect(isValidImageType('image/gif')).toBe(true);
            expect(isValidImageType('image/webp')).toBe(true);
        });

        it('should reject invalid image types', () => {
            expect(isValidImageType('application/pdf')).toBe(false);
            expect(isValidImageType('text/plain')).toBe(false);
        });
    });

    describe('isValidFileSize', () => {
        it('should accept files within size limit', () => {
            const maxSize = 5 * 1024 * 1024; // 5MB
            expect(isValidFileSize(maxSize - 1, 5)).toBe(true);
            expect(isValidFileSize(maxSize, 5)).toBe(true);
        });

        it('should reject files exceeding size limit', () => {
            const maxSize = 5 * 1024 * 1024; // 5MB
            expect(isValidFileSize(maxSize + 1, 5)).toBe(false);
        });
    });
});
