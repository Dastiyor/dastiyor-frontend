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
