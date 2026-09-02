/**
 * Render a task timestamp for display.
 *
 * The API sends ISO 8601. It used to send `toLocaleDateString('ru-RU')`, which
 * dropped the time entirely -- clients that parsed it reconstructed midnight,
 * so a task posted minutes ago read as "4 hours ago". The legacy DD.MM.YYYY
 * shape is still accepted so cached responses keep rendering.
 */
export function formatTaskDate(value: string): string {
    if (!value) return '';

    // Legacy "DD.MM.YYYY" from older responses.
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) return value;

    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ru-RU');
}
