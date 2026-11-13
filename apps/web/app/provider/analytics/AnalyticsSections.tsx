import Link from 'next/link';
import { Lock } from 'lucide-react';
import type {
    AdvancedProfileAnalytics,
    AnalyticsNamedCount,
    AnalyticsSection,
    ProfileAnalytics,
    ProfileViewSource,
    ResponseAnalytics,
    SubscriptionTier,
} from '@dastiyor/types';
import { PLANS } from '@/lib/plans';

/** Plain functions, so these render on the server with no client JS. */
type T = (key: string, params?: Record<string, string | number>) => string;
type Tr = (value: string) => string;

const card: React.CSSProperties = {
    backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', marginBottom: '24px',
};
const h2: React.CSSProperties = { fontSize: '1.15rem', fontWeight: 700, color: '#1E293B', marginBottom: '4px' };
const h3: React.CSSProperties = { fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', margin: '20px 0 10px' };
const muted: React.CSSProperties = { color: '#64748B', fontSize: '0.85rem' };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '16px' };
const th: React.CSSProperties = { textAlign: 'left', padding: '8px', color: '#64748B', fontWeight: 600, borderBottom: '1px solid #E2E8F0' };
const td: React.CSSProperties = { padding: '8px', borderBottom: '1px solid #F1F5F9' };

const SOURCES: ProfileViewSource[] = ['directory', 'task', 'search', 'direct'];
const SOURCE_COLORS: Record<ProfileViewSource, string> = { directory: '#2563EB', task: '#059669', search: '#F59E0B', direct: '#94A3B8' };

export function pct(value: number | null, t: T): string {
    return value === null ? t('analytics.noValue') : `${value}%`;
}

/** "13.11" from "2026-11-13". */
function shortDate(date: string): string {
    return `${date.slice(8, 10)}.${date.slice(5, 7)}`;
}

/** "11.2026" from "2026-11". */
function shortMonth(month: string): string {
    return `${month.slice(5, 7)}.${month.slice(0, 4)}`;
}

export function formatMinutes(minutes: number, t: T): string {
    if (minutes < 60) return t('analytics.responses.minutes', { m: minutes });
    if (minutes < 24 * 60) return t('analytics.responses.hours', { h: Math.floor(minutes / 60), m: minutes % 60 });
    return t('analytics.responses.days', { d: Math.floor(minutes / 1440), h: Math.floor((minutes % 1440) / 60) });
}

function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={muted}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', marginTop: '4px' }}>{value}</div>
        </div>
    );
}

function SectionHeader({ title, desc }: { title: string; desc: string }) {
    return (
        <>
            <h2 style={h2}>{title}</h2>
            <p style={muted}>{desc}</p>
        </>
    );
}

/** Daily views as CSS bars. */
export function ViewsChart({ daily, t }: { daily: ProfileAnalytics['daily']; t: T }) {
    const max = Math.max(1, ...daily.map(d => d.views));
    return (
        <div role="img" aria-label={t('analytics.profile.chartLabel')}
            style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '140px', marginTop: '16px', padding: '0 2px', borderBottom: '1px solid #E2E8F0' }}>
            {daily.map(d => (
                <div key={d.date} title={t('analytics.profile.chartBar', { date: shortDate(d.date), n: d.views })}
                    style={{ flex: 1, minWidth: '4px', height: `${Math.max(2, (d.views / max) * 100)}%`, backgroundColor: d.views ? 'var(--primary)' : '#E2E8F0', borderRadius: '3px 3px 0 0' }} />
            ))}
        </div>
    );
}

function Bars({ rows, tr, t }: { rows: AnalyticsNamedCount[]; tr: Tr; t: T }) {
    if (rows.length === 0) return <p style={muted}>{t('analytics.advanced.breakdownEmpty')}</p>;
    const max = Math.max(...rows.map(r => r.views));
    return (
        <div style={{ display: 'grid', gap: '8px' }}>
            {rows.map(r => (
                <div key={r.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 160px) 1fr 40px', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                    <span>{tr(r.name)}</span>
                    <span style={{ height: '10px', borderRadius: '5px', backgroundColor: 'var(--primary)', width: `${(r.views / max) * 100}%` }} />
                    <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.views}</span>
                </div>
            ))}
        </div>
    );
}

export function ProfileSection({ data, range, t }: { data: ProfileAnalytics; range: 7 | 30; t: T }) {
    const daily = range === 7 ? data.daily.slice(-7) : data.daily;
    const total = SOURCES.reduce((n, s) => n + data.sources[s], 0);
    const tab = (r: 7 | 30): React.CSSProperties => ({
        padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none',
        backgroundColor: range === r ? 'var(--primary)' : '#F1F5F9', color: range === r ? 'white' : '#475569',
    });
    return (
        <section style={card} aria-labelledby="an-profile">
            <div id="an-profile"><SectionHeader title={t('analytics.profile.title')} desc={t('analytics.profile.desc')} /></div>
            <div style={grid}>
                <Stat label={t('analytics.profile.views7')} value={data.views7} />
                <Stat label={t('analytics.profile.views30')} value={data.views30} />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <Link href="/provider/analytics?range=7" style={tab(7)} aria-current={range === 7 ? 'page' : undefined}>{t('analytics.profile.range7')}</Link>
                <Link href="/provider/analytics" style={tab(30)} aria-current={range === 30 ? 'page' : undefined}>{t('analytics.profile.range30')}</Link>
            </div>
            <ViewsChart daily={daily} t={t} />
            <div style={{ display: 'flex', justifyContent: 'space-between', ...muted, fontSize: '0.75rem', marginTop: '4px' }}>
                <span>{shortDate(daily[0].date)}</span>
                <span>{shortDate(daily[daily.length - 1].date)}</span>
            </div>

            <h3 style={h3}>{t('analytics.profile.sourcesTitle')}</h3>
            <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
                {total > 0 && SOURCES.map(s => (
                    <span key={s} style={{ width: `${(data.sources[s] / total) * 100}%`, backgroundColor: SOURCE_COLORS[s] }} />
                ))}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontSize: '0.85rem' }}>
                {SOURCES.map(s => (
                    <li key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: SOURCE_COLORS[s] }} />
                        {t(`analytics.profile.sources.${s}`)}: <strong>{data.sources[s]}</strong>
                    </li>
                ))}
            </ul>

            <h3 style={h3}>{t('analytics.profile.conversionTitle')}</h3>
            <div style={{ ...grid, marginTop: 0 }}>
                <Stat label={t('analytics.profile.responses')} value={data.responses} />
                <Stat label={t('analytics.profile.hired')} value={data.hired} />
                <Stat label={t('analytics.profile.conversion')} value={pct(data.conversion, t)} />
            </div>
        </section>
    );
}

export function AdvancedSection({ data, t, tr }: { data: AdvancedProfileAnalytics; t: T; tr: Tr }) {
    const rows: { key: 'views30' | 'responses30' | 'conversion30'; format: (v: number | null) => string | number }[] = [
        { key: 'views30', format: v => v ?? 0 },
        { key: 'responses30', format: v => v ?? 0 },
        { key: 'conversion30', format: v => pct(v, t) },
    ];
    return (
        <section style={card} aria-labelledby="an-advanced">
            <div id="an-advanced"><SectionHeader title={t('analytics.advanced.title')} desc={t('analytics.advanced.desc')} /></div>

            <h3 style={h3}>{t('analytics.advanced.comparisonTitle')}</h3>
            {data.peers ? (
                <>
                    <p style={{ ...muted, marginBottom: '8px' }}>{t('analytics.advanced.peers', { count: data.peers.count })}</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr><th style={th} /><th style={th}>{t('analytics.advanced.you')}</th><th style={th}>{t('analytics.advanced.average')}</th></tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.key}>
                                    <td style={td}>{t(`analytics.advanced.${r.key}`)}</td>
                                    <td style={{ ...td, fontWeight: 700 }}>{r.format(data.you[r.key])}</td>
                                    <td style={td}>{r.format(data.peers![r.key])}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            ) : (
                <p style={muted}>{t('analytics.advanced.noPeers')}</p>
            )}

            <p style={{ ...muted, marginTop: '20px' }}>{t('analytics.advanced.breakdownHint')}</p>
            <h3 style={h3}>{t('analytics.advanced.byCategory')}</h3>
            <Bars rows={data.byCategory} tr={tr} t={t} />
            <h3 style={h3}>{t('analytics.advanced.byCity')}</h3>
            <Bars rows={data.byCity} tr={tr} t={t} />
        </section>
    );
}

export function ResponsesSection({ data, t, tr }: { data: ResponseAnalytics; t: T; tr: Tr }) {
    const maxMonth = Math.max(1, ...data.monthly.map(m => m.sent));
    return (
        <section style={card} aria-labelledby="an-responses">
            <div id="an-responses"><SectionHeader title={t('analytics.responses.title')} desc={t('analytics.responses.desc')} /></div>
            <div style={grid}>
                <Stat label={t('analytics.responses.sent')} value={data.sent} />
                <Stat label={t('analytics.responses.viewed')} value={data.viewed ?? t('analytics.responses.viewedNotTracked')} />
                <Stat label={t('analytics.responses.hired')} value={data.hired} />
                <Stat label={t('analytics.responses.conversion')} value={pct(data.conversion, t)} />
                <Stat label={t('analytics.responses.avgResponseTime')}
                    value={data.avgResponseMinutes === null ? t('analytics.noValue') : formatMinutes(data.avgResponseMinutes, t)} />
            </div>

            {data.sent === 0 ? <p style={{ ...muted, marginTop: '16px' }}>{t('analytics.responses.empty')}</p> : (
                <>
                    <h3 style={h3}>{t('analytics.responses.byCategory')}</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr>
                                    <th style={th}>{t('analytics.responses.category')}</th>
                                    <th style={th}>{t('analytics.responses.sent')}</th>
                                    <th style={th}>{t('analytics.responses.hired')}</th>
                                    <th style={th}>{t('analytics.responses.conversion')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.byCategory.map(c => (
                                    <tr key={c.name}>
                                        <td style={td}>{tr(c.name)}</td>
                                        <td style={td}>{c.sent}</td>
                                        <td style={td}>{c.hired}</td>
                                        <td style={td}>{pct(c.conversion, t)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <h3 style={h3}>{t('analytics.responses.monthly')}</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
                {data.monthly.map(m => (
                    <div key={m.month} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 70px', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                        <span>{shortMonth(m.month)}</span>
                        <span style={{ position: 'relative', height: '12px', borderRadius: '6px', backgroundColor: '#F1F5F9' }}>
                            <span style={{ position: 'absolute', inset: 0, width: `${(m.sent / maxMonth) * 100}%`, backgroundColor: '#BFDBFE', borderRadius: '6px' }} />
                            <span style={{ position: 'absolute', inset: 0, width: `${(m.hired / maxMonth) * 100}%`, backgroundColor: 'var(--primary)', borderRadius: '6px' }} />
                        </span>
                        <span style={{ textAlign: 'right' }}>{m.hired} / {m.sent}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

/**
 * A section the plan does not include. Website checkout may be off (plans are
 * sold only in the iPhone app for now), so the link goes to the plans page only
 * when it exists, and to the app page otherwise.
 */
export function LockedSection({ section, plan, checkoutOnWeb, t }: {
    section: AnalyticsSection; plan: SubscriptionTier; checkoutOnWeb: boolean; t: T;
}) {
    return (
        <section style={{ ...card, backgroundColor: '#F8FAFC', borderStyle: 'dashed' }} aria-labelledby={`an-locked-${section}`}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <Lock size={20} color="#64748B" aria-hidden style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    <div id={`an-locked-${section}`}><SectionHeader title={t(`analytics.${section}.title`)} desc={t(`analytics.${section}.desc`)} /></div>
                    <p style={{ fontWeight: 600, color: '#1E293B', margin: '12px 0' }}>{t('analytics.locked.title', { plan: PLANS[plan].name })}</p>
                    {checkoutOnWeb ? (
                        <Link href="/subscription" className="btn btn-primary">{t('analytics.locked.cta')}</Link>
                    ) : (
                        <>
                            <p style={{ ...muted, marginBottom: '12px' }}>{t('analytics.locked.appOnly')}</p>
                            <Link href="/mobile-app" className="btn btn-outline">{t('analytics.locked.appCta')}</Link>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
