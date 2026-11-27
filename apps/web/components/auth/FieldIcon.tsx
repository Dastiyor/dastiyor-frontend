import type { LucideIcon } from 'lucide-react';

/**
 * A grey icon inside the left edge of an auth form field (person, lock).
 * Put it in a `position: relative` wrapper with the input, and give the input
 * `paddingLeft: FIELD_ICON_PADDING`. Decorative: the field's <label> names it.
 */
export const FIELD_ICON_PADDING = '42px';

export default function FieldIcon({ icon: Icon }: { icon: LucideIcon }) {
    return (
        <span
            aria-hidden="true"
            style={{
                position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                display: 'flex', color: 'var(--text-light)', pointerEvents: 'none',
            }}
        >
            <Icon size={18} />
        </span>
    );
}
