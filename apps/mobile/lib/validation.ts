interface PasswordStrengthMessages {
  errLength: string;
  errNeedLetter: string;
  errNeedDigit: string;
}

export function passwordStrength(pw: string, msgs: PasswordStrengthMessages): string[] {
  const issues: string[] = [];
  if (pw.length < 8) issues.push(msgs.errLength);
  if (!/[A-Za-zА-Яа-яЁё]/.test(pw)) issues.push(msgs.errNeedLetter);
  if (!/[0-9]/.test(pw)) issues.push(msgs.errNeedDigit);
  return issues;
}
