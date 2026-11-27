/**
 * The nine digits behind the fixed +992 prefix, from whatever was typed, pasted
 * or autofilled -- including a whole "+992 90 123 4567".
 */
export function localPhoneDigits(text: string): string {
    const digits = text.replace(/\D/g, '');
    // Twelve digits, so a local number that itself starts with 992 keeps them.
    return (digits.length >= 12 && digits.startsWith('992') ? digits.slice(3) : digits).slice(0, 9);
}
