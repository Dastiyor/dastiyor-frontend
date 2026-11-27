import { localPhoneDigits } from '../phone-input';

it('keeps the nine local digits of whatever was entered', () => {
    expect(localPhoneDigits('+992 90 123 4567')).toBe('901234567');
    expect(localPhoneDigits('90-123-45-67')).toBe('901234567');
    // A local number starting with 992, plus one keystroke too many.
    expect(localPhoneDigits('9921234567')).toBe('992123456');
});
