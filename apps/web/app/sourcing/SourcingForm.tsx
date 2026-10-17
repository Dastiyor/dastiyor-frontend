'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { SourcingRequest } from '@dastiyor/types';
import { useTranslation } from '@/lib/i18n';
import { useHydrated } from '@/lib/useHydrated';

const field: React.CSSProperties = { display: 'grid', gap: '6px', minWidth: 0 };
const input: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '1rem', background: 'white' };
const label: React.CSSProperties = { fontWeight: 600, fontSize: '0.9rem' };

/**
 * Company sourcing request form + "my requests". The inputs are uncontrolled and read
 * through FormData on submit, so text typed before hydration is never lost.
 */
export default function SourcingForm({ categories, cities }: { categories: string[]; cities: string[] }) {
    const { t, tr, tError } = useTranslation();
    const hydrated = useHydrated();
    const formRef = useRef<HTMLFormElement>(null);
    const [requests, setRequests] = useState<SourcingRequest[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    useEffect(() => {
        fetch('/api/sourcing').then(r => r.json()).then(d => setRequests(d.requests ?? [])).catch(() => {});
    }, []);

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const str = (k: string) => String(f.get(k) ?? '').trim() || undefined;
        const num = (k: string) => (str(k) ? Number(str(k)) : undefined);
        setBusy(true);
        setError('');
        setSent(false);
        try {
            const res = await fetch('/api/sourcing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: str('category'), city: str('city'), headcount: num('headcount'), experienceYears: num('experienceYears'),
                    budget: str('budget'), deadline: str('deadline'), description: str('description'),
                    contactName: str('contactName'), contactPhone: str('contactPhone'), contactEmail: str('contactEmail'),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(tError(data.error) || t('sourcing.failed'));
                return;
            }
            setRequests(list => [{ ...data.request, proposed: [] }, ...list]);
            setSent(true);
            formRef.current?.reset();
        } catch {
            setError(t('sourcing.failed'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '32px' }}>
            <form ref={formRef} method="post" onSubmit={submit} style={{ display: 'grid', gap: '16px', background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                {error && <div role="alert" style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px' }}>{error}</div>}
                {sent && <div role="status" style={{ background: '#dcfce7', color: '#166534', padding: '12px 16px', borderRadius: '8px' }}>{t('sourcing.sent')}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={field}>
                        <label htmlFor="sr-category" style={label}>{t('sourcing.category')} *</label>
                        <select id="sr-category" name="category" required style={input} defaultValue="">
                            <option value="" disabled>{t('sourcing.choose')}</option>
                            {categories.map(c => <option key={c} value={c}>{tr(c)}</option>)}
                        </select>
                    </div>
                    <div style={field}>
                        <label htmlFor="sr-city" style={label}>{t('sourcing.city')} *</label>
                        <select id="sr-city" name="city" required style={input} defaultValue="">
                            <option value="" disabled>{t('sourcing.choose')}</option>
                            {cities.map(c => <option key={c} value={c}>{tr(c)}</option>)}
                        </select>
                    </div>
                    <div style={field}>
                        <label htmlFor="sr-headcount" style={label}>{t('sourcing.headcount')} *</label>
                        <input id="sr-headcount" name="headcount" type="number" min={1} max={500} step={1} required style={input} />
                    </div>
                    <div style={field}>
                        <label htmlFor="sr-experience" style={label}>{t('sourcing.experienceYears')}</label>
                        <input id="sr-experience" name="experienceYears" type="number" min={0} max={60} step={1} style={input} />
                    </div>
                    <div style={field}>
                        <label htmlFor="sr-budget" style={label}>{t('sourcing.budget')}</label>
                        <input id="sr-budget" name="budget" maxLength={100} placeholder={t('sourcing.budgetPlaceholder')} style={input} />
                    </div>
                    <div style={field}>
                        <label htmlFor="sr-deadline" style={label}>{t('sourcing.deadline')}</label>
                        <input id="sr-deadline" name="deadline" type="date" style={input} />
                    </div>
                </div>

                <div style={field}>
                    <label htmlFor="sr-description" style={label}>{t('sourcing.description')} *</label>
                    <textarea id="sr-description" name="description" required minLength={20} maxLength={2000} rows={5}
                        placeholder={t('sourcing.descriptionPlaceholder')} style={{ ...input, resize: 'vertical' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={field}>
                        <label htmlFor="sr-name" style={label}>{t('sourcing.contactName')} *</label>
                        <input id="sr-name" name="contactName" required maxLength={100} autoComplete="organization" style={input} />
                    </div>
                    <div style={field}>
                        <label htmlFor="sr-phone" style={label}>{t('sourcing.contactPhone')} *</label>
                        <input id="sr-phone" name="contactPhone" type="tel" required placeholder="+992 XXX XXX XXX" autoComplete="tel" style={input} />
                    </div>
                    <div style={field}>
                        <label htmlFor="sr-email" style={label}>{t('sourcing.contactEmail')}</label>
                        <input id="sr-email" name="contactEmail" type="email" autoComplete="email" style={input} />
                    </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={!hydrated || busy} style={{ justifySelf: 'start' }}>
                    {busy ? t('sourcing.sending') : t('sourcing.submit')}
                </button>
            </form>

            {requests.length > 0 && (
                <section aria-labelledby="sr-mine" style={{ display: 'grid', gap: '12px' }}>
                    <h2 id="sr-mine" className="heading-md">{t('sourcing.myRequests')}</h2>
                    {requests.map(r => (
                        <div key={r.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', display: 'grid', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                <strong>{tr(r.category)} · {tr(r.city)} · {r.headcount}</strong>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>{t(`sourcing.status_${r.status}`)}</span>
                            </div>
                            <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
                            {r.proposed.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span>{t('sourcing.proposed')}:</span>
                                    {r.proposed.map(p => <Link key={p.id} href={`/provider/${p.id}`}>{p.fullName}</Link>)}
                                </div>
                            )}
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}
