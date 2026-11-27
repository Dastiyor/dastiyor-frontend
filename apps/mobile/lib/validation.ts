interface PasswordStrengthMessages {
  errLength: string;
}

/**
 * The password rule, same as the server's (apps/web/lib/validation.ts): at
 * least 8 characters, nothing else. The letter-and-digit requirement was
 * dropped in Nov 2026; people were giving up at signup over it. The 70-character
 * cap is left to the server, whose message the app already translates.
 */
export function passwordStrength(pw: string, msgs: PasswordStrengthMessages): string[] {
  return pw.length < 8 ? [msgs.errLength] : [];
}

/**
 * The nine digits behind the fixed +992 prefix, from whatever was typed, pasted
 * or autofilled. Same rule as apps/web/lib/phone-input.ts.
 */
export function localPhoneDigits(text: string): string {
  const digits = text.replace(/\D/g, '');
  // Twelve digits, so a local number that itself starts with 992 keeps them.
  return (digits.length >= 12 && digits.startsWith('992') ? digits.slice(3) : digits).slice(0, 9);
}
