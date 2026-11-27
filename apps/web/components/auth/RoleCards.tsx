import { useTranslation } from '@/lib/i18n';

export type SignupRole = 'customer' | 'provider';

const ROLES = [
    { role: 'customer', title: 'auth.iWantToFind', desc: 'auth.iWantToFindDesc', icon: '👤', color: 'var(--primary)', tint: '#e8f0fe' },
    { role: 'provider', title: 'auth.iWantToWork', desc: 'auth.iWantToWorkDesc', icon: '💼', color: 'var(--accent)', tint: '#fff3e0' },
] as const;

const cardStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '14px', width: '100%', boxSizing: 'border-box',
    padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--white)',
    textAlign: 'left', textDecoration: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer',
};

/**
 * The customer / provider choice that ends signup. Nothing is preselected: a
 * default is how providers ended up as customers. With `hrefFor` the cards are
 * plain links (Google / Apple, which need the role in the URL); otherwise they
 * are buttons that call `onPick`.
 */
export default function RoleCards({ onPick, hrefFor, disabled = false }: {
    onPick?: (role: SignupRole) => void;
    hrefFor?: (role: SignupRole) => string;
    disabled?: boolean;
}) {
    const { t } = useTranslation();
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ROLES.map(({ role, title, desc, icon, color, tint }) => {
                const content = (
                    <>
                        <span aria-hidden="true" style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', backgroundColor: tint, color }}>
                            {icon}
                        </span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t(title)}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{t(desc)}</span>
                        </span>
                    </>
                );
                return hrefFor ? (
                    <a key={role} href={hrefFor(role)} style={cardStyle}>{content}</a>
                ) : (
                    <button key={role} type="button" disabled={disabled} onClick={() => onPick?.(role)} style={{ ...cardStyle, opacity: disabled ? 0.6 : 1 }}>
                        {content}
                    </button>
                );
            })}
            <p style={{ margin: 0, textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                {t('auth.roleAdvertiseHint')}
            </p>
        </div>
    );
}
