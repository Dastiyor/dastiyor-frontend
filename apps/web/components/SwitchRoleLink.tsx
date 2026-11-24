import Link from 'next/link';
import { Repeat } from 'lucide-react';

/** Profile-page entry to /switch-role. Server component: labels come in translated. */
export default function SwitchRoleLink({ label, hint }: { label: string; hint: string }) {
    return (
        <Link
            href="/switch-role"
            style={{
                display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '800px',
                padding: '16px 20px', marginTop: '24px', borderRadius: '12px',
                border: '1px solid #E2E8F0', backgroundColor: 'white', textDecoration: 'none', color: '#1E293B',
            }}
        >
            <Repeat size={20} color="#64748B" style={{ flexShrink: 0 }} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: '0.85rem', color: '#64748B' }}>{hint}</span>
            </span>
        </Link>
    );
}
