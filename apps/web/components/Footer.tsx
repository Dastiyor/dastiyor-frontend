'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';
import { COMPANY_DEFAULTS, type Company } from '@/lib/company-defaults';

const linkStyle = { color: '#4B5563', textDecoration: 'none', fontSize: '0.95rem' };

/** Company details come from the admin panel; see lib/company.ts. */
export default function Footer({ company = COMPANY_DEFAULTS }: { company?: Company }) {
    const { t } = useTranslation();
    // Each row is omitted when the admin leaves that field blank, so a
    // partly-filled form never renders a dangling label.
    const contacts = [
        company.phone && { key: 'phone', href: `tel:${company.phone.replace(/[^+\d]/g, '')}`, text: company.phone },
        company.email && { key: 'email', href: `mailto:${company.email}`, text: company.email },
        company.supportEmail && company.supportEmail !== company.email && {
            key: 'support', href: `mailto:${company.supportEmail}`, text: company.supportEmail,
        },
    ].filter(Boolean) as { key: string; href: string; text: string }[];

    return (
        <footer style={{ backgroundColor: '#FFFFFF', padding: '80px 0 40px', borderTop: '1px solid #E5E7EB', marginTop: 'auto' }}>
            <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '40px',
                    marginBottom: '60px'
                }}>
                    {/* Brand Column */}
                    <div>
                        <Link href="/" style={{
                            display: 'flex',
                            alignItems: 'center',
                            textDecoration: 'none',
                            marginBottom: '20px'
                        }}>
                            <Image
                                src="/logo-blue-white.svg"
                                alt="Dastiyor"
                                width={120}
                                height={40}
                                style={{ objectFit: 'contain' }}
                            />
                        </Link>
                        <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '0.95rem', maxWidth: '300px' }}>
                            {t('footer.tagline')}
                        </p>
                    </div>

                    {/* Platform Column */}
                    <div>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: '800', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px' }}>
                            {t('footer.platform')}
                        </h4>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', listStyle: 'none', padding: 0 }}>
                            <li><Link href="/how-it-works" style={{ color: '#4B5563', textDecoration: 'none', fontSize: '0.95rem' }}>{t('footer.howItWorks')}</Link></li>
                            <li><Link href="/safety" style={{ color: '#4B5563', textDecoration: 'none', fontSize: '0.95rem' }}>{t('footer.safety')}</Link></li>
                            <li><Link href="/help" style={{ color: '#4B5563', textDecoration: 'none', fontSize: '0.95rem' }}>{t('footer.help')}</Link></li>
                        </ul>
                    </div>

                    {/* Categories Column */}
                    <div>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: '800', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px' }}>
                            {t('footer.categories')}
                        </h4>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', listStyle: 'none', padding: 0 }}>
                            <li><Link href="/tasks?category=%D0%A3%D0%B1%D0%BE%D1%80%D0%BA%D0%B0" style={{ color: '#4B5563', textDecoration: 'none', fontSize: '0.95rem' }}>{t('footer.cleaning')}</Link></li>
                            <li><Link href="/tasks?category=%D0%A0%D0%B5%D0%BC%D0%BE%D0%BD%D1%82" style={{ color: '#4B5563', textDecoration: 'none', fontSize: '0.95rem' }}>{t('footer.handyman')}</Link></li>
                            <li><Link href="/tasks?category=%D0%94%D0%BE%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0" style={{ color: '#4B5563', textDecoration: 'none', fontSize: '0.95rem' }}>{t('footer.delivery')}</Link></li>
                        </ul>
                    </div>

                    {/* Join Us Column */}
                    <div>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: '800', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px' }}>
                            {t('footer.joinUs')}
                        </h4>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', listStyle: 'none', padding: 0 }}>
                            <li><Link href="/register?type=provider" style={{ color: '#4B5563', textDecoration: 'none', fontSize: '0.95rem' }}>{t('footer.becomeProvider')}</Link></li>
                            {SUBSCRIPTIONS_ENABLED && (
                                <li><Link href="/contractor-plans" style={{ color: '#4B5563', textDecoration: 'none', fontSize: '0.95rem' }}>{t('footer.plans')}</Link></li>
                            )}
                            <li><Link href="/mobile-app" style={{ color: '#4B5563', textDecoration: 'none', fontSize: '0.95rem' }}>{t('footer.mobileApp')}</Link></li>
                        </ul>
                    </div>

                    {/* Contacts Column — values managed in the admin panel */}
                    <div>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: '800', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px' }}>
                            {t('footer.contacts')}
                        </h4>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', listStyle: 'none', padding: 0 }}>
                            {contacts.map(c => (
                                <li key={c.key}><a href={c.href} style={linkStyle}>{c.text}</a></li>
                            ))}
                            {company.address && (
                                <li style={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: '1.5' }}>{company.address}</li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div style={{
                    paddingTop: '32px',
                    borderTop: '1px solid #F3F4F6',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '20px',
                    color: '#9CA3AF',
                    fontSize: '0.9rem'
                }}>
                    <div>
                        © {new Date().getFullYear()} Dastiyor Inc. {t('footer.allRightsReserved')}
                    </div>
                    <div style={{ display: 'flex', gap: '32px' }}>
                        <Link href="/privacy" style={{ color: '#6B7280', textDecoration: 'none' }}>{t('footer.privacy')}</Link>
                        <Link href="/terms" style={{ color: '#6B7280', textDecoration: 'none' }}>{t('footer.terms')}</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
