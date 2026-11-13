import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { GradientButton } from '@/components/Premium';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  AdvancedProfileAnalytics,
  AnalyticsNamedCount,
  AnalyticsSection,
  ProfileAnalytics,
  ProfileViewSource,
  ProviderAnalytics,
  ResponseAnalytics,
  SubscriptionTier,
} from '@dastiyor/types';
import type { Translations } from '@/lib/i18n';

type Labels = Translations['analytics'];
type Tr = (v: string) => string;

const PLAN_NAMES: Record<'free' | SubscriptionTier, string> = { free: 'FREE', pro: 'PRO', pro_plus: 'PRO+', business: 'BUSINESS' };
const SOURCES: ProfileViewSource[] = ['directory', 'task', 'search', 'direct'];
const SOURCE_COLORS: Record<ProfileViewSource, string> = { directory: '#2563EB', task: '#059669', search: '#F59E0B', direct: '#94A3B8' };

const fill = (s: string, params: Record<string, string | number>) =>
  Object.entries(params).reduce((out, [k, v]) => out.replace(`{${k}}`, String(v)), s);

export function pct(v: number | null, l: Labels): string {
  return v === null ? l.noValue : `${v}%`;
}

export function formatMinutes(m: number, l: Labels): string {
  if (m < 60) return fill(l.minutes, { m });
  if (m < 1440) return fill(l.hours, { h: Math.floor(m / 60), m: m % 60 });
  return fill(l.days, { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60) });
}

/** "13.11.2026" from "2026-11-13". */
export function dmy(date: string): string {
  const [y, m, d] = date.split('-');
  return d ? `${d}.${m}.${y}` : `${m}.${y}`;
}

function Card({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>;
}

function Header({ title, desc }: { title: string; desc: string }) {
  const { colors } = useTheme();
  return (
    <>
      <Text style={[styles.h2, { color: colors.text }]} accessibilityRole="header">{title}</Text>
      <Text style={[styles.muted, { color: colors.textSecondary }]}>{desc}</Text>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surfaceAlt }]}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function Sub({ children }: { children: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.h3, { color: colors.text }]}>{children}</Text>;
}

function Bars({ rows, tr, l }: { rows: AnalyticsNamedCount[]; tr: Tr; l: Labels }) {
  const { colors } = useTheme();
  if (rows.length === 0) return <Text style={[styles.muted, { color: colors.textSecondary }]}>{l.breakdownEmpty}</Text>;
  const max = Math.max(...rows.map((r) => r.views));
  return (
    <View style={styles.gap8}>
      {rows.map((r) => (
        <View key={r.name} style={styles.barRow}>
          <Text style={[styles.barName, { color: colors.text }]} numberOfLines={1}>{tr(r.name)}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(r.views / max) * 100}%`, backgroundColor: colors.accent }]} />
          </View>
          <Text style={[styles.barValue, { color: colors.text }]}>{r.views}</Text>
        </View>
      ))}
    </View>
  );
}

function ProfileCard({ data, l }: { data: ProfileAnalytics; l: Labels }) {
  const { colors } = useTheme();
  const [range, setRange] = useState<7 | 30>(30);
  const daily = range === 7 ? data.daily.slice(-7) : data.daily;
  const max = Math.max(1, ...daily.map((d) => d.views));
  const total = SOURCES.reduce((n, s) => n + data.sources[s], 0);
  return (
    <Card>
      <Header title={l.profileTitle} desc={l.profileDesc} />
      <View style={styles.statRow}>
        <Stat label={l.views7} value={data.views7} />
        <Stat label={l.views30} value={data.views30} />
      </View>
      <View style={styles.tabs}>
        {([7, 30] as const).map((r) => (
          <TouchableOpacity key={r} onPress={() => setRange(r)} accessibilityRole="button" accessibilityState={{ selected: range === r }}
            style={[styles.tab, { backgroundColor: range === r ? colors.accent : colors.surfaceAlt }]}>
            <Text style={[styles.tabText, { color: range === r ? '#FFFFFF' : colors.textSecondary }]}>{r === 7 ? l.range7 : l.range30}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View testID="views-chart" accessible accessibilityLabel={l.chartLabel} style={[styles.chart, { borderBottomColor: colors.border }]}>
        {daily.map((d) => (
          <View key={d.date} style={[styles.chartBar, { height: `${Math.max(2, (d.views / max) * 100)}%`, backgroundColor: d.views ? colors.accent : colors.border }]} />
        ))}
      </View>
      <View style={styles.chartAxis}>
        <Text style={[styles.small, { color: colors.textTertiary }]}>{dmy(daily[0].date).slice(0, 5)}</Text>
        <Text style={[styles.small, { color: colors.textTertiary }]}>{dmy(daily[daily.length - 1].date).slice(0, 5)}</Text>
      </View>

      <Sub>{l.sourcesTitle}</Sub>
      <View style={[styles.stack, { backgroundColor: colors.surfaceAlt }]}>
        {total > 0 && SOURCES.map((s) => (
          <View key={s} style={{ width: `${(data.sources[s] / total) * 100}%`, backgroundColor: SOURCE_COLORS[s] }} />
        ))}
      </View>
      {SOURCES.map((s) => (
        <View key={s} style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: SOURCE_COLORS[s] }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>{l.sources[s]}</Text>
          <Text style={[styles.legendValue, { color: colors.text }]}>{data.sources[s]}</Text>
        </View>
      ))}

      <Sub>{l.conversionTitle}</Sub>
      <View style={styles.statRow}>
        <Stat label={l.responses} value={data.responses} />
        <Stat label={l.hired} value={data.hired} />
        <Stat label={l.conversion} value={pct(data.conversion, l)} />
      </View>
    </Card>
  );
}

function AdvancedCard({ data, l, tr }: { data: AdvancedProfileAnalytics; l: Labels; tr: Tr }) {
  const { colors } = useTheme();
  const rows = [
    { label: l.metricViews, you: data.you.views30, avg: data.peers?.views30 },
    { label: l.metricResponses, you: data.you.responses30, avg: data.peers?.responses30 },
    { label: l.metricConversion, you: pct(data.you.conversion30, l), avg: data.peers ? pct(data.peers.conversion30, l) : '' },
  ];
  return (
    <Card>
      <Header title={l.advancedTitle} desc={l.advancedDesc} />
      <Sub>{l.comparisonTitle}</Sub>
      {data.peers ? (
        <>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>{fill(l.peers, { count: data.peers.count })}</Text>
          <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.cellWide, { color: colors.textSecondary }]} />
            <Text style={[styles.cell, styles.bold, { color: colors.textSecondary }]}>{l.you}</Text>
            <Text style={[styles.cell, styles.bold, { color: colors.textSecondary }]}>{l.average}</Text>
          </View>
          {rows.map((r) => (
            <View key={r.label} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.cellWide, { color: colors.text }]}>{r.label}</Text>
              <Text style={[styles.cell, styles.bold, { color: colors.text }]}>{r.you}</Text>
              <Text style={[styles.cell, { color: colors.text }]}>{r.avg}</Text>
            </View>
          ))}
        </>
      ) : (
        <Text style={[styles.muted, { color: colors.textSecondary }]}>{l.noPeers}</Text>
      )}
      <Text style={[styles.muted, styles.mt16, { color: colors.textSecondary }]}>{l.breakdownHint}</Text>
      <Sub>{l.byCategory}</Sub>
      <Bars rows={data.byCategory} tr={tr} l={l} />
      <Sub>{l.byCity}</Sub>
      <Bars rows={data.byCity} tr={tr} l={l} />
    </Card>
  );
}

function ResponsesCard({ data, l, tr }: { data: ResponseAnalytics; l: Labels; tr: Tr }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...data.monthly.map((m) => m.sent));
  return (
    <Card>
      <Header title={l.responsesTitle} desc={l.responsesDesc} />
      <View style={styles.statRow}>
        <Stat label={l.sent} value={data.sent} />
        <Stat label={l.viewed} value={data.viewed ?? l.viewedNotTracked} />
      </View>
      <View style={styles.statRow}>
        <Stat label={l.hiredTotal} value={data.hired} />
        <Stat label={l.conversion} value={pct(data.conversion, l)} />
      </View>
      <View style={styles.statRow}>
        <Stat label={l.avgResponseTime} value={data.avgResponseMinutes === null ? l.noValue : formatMinutes(data.avgResponseMinutes, l)} />
      </View>

      {data.sent === 0 ? (
        <Text style={[styles.muted, styles.mt16, { color: colors.textSecondary }]}>{l.responsesEmpty}</Text>
      ) : (
        <>
          <Sub>{l.byCategoryResponses}</Sub>
          {data.byCategory.map((c) => (
            <View key={c.name} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.cellWide, { color: colors.text }]} numberOfLines={1}>{tr(c.name)}</Text>
              <Text style={[styles.cell, { color: colors.text }]}>{`${c.hired} / ${c.sent}`}</Text>
              <Text style={[styles.cell, styles.bold, { color: colors.text }]}>{pct(c.conversion, l)}</Text>
            </View>
          ))}
        </>
      )}

      <Sub>{l.monthly}</Sub>
      <View style={styles.gap8}>
        {data.monthly.map((m) => (
          <View key={m.month} style={styles.barRow}>
            <Text style={[styles.monthName, { color: colors.text }]}>{dmy(m.month)}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, styles.abs, { width: `${(m.sent / max) * 100}%`, backgroundColor: '#BFDBFE' }]} />
              <View style={[styles.barFill, styles.abs, { width: `${(m.hired / max) * 100}%`, backgroundColor: colors.accent }]} />
            </View>
            <Text style={[styles.barValue, { color: colors.text }]}>{`${m.hired} / ${m.sent}`}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const SECTION_TEXT: Record<AnalyticsSection, (l: Labels) => [string, string]> = {
  profile: (l) => [l.profileTitle, l.profileDesc],
  advanced: (l) => [l.advancedTitle, l.advancedDesc],
  responses: (l) => [l.responsesTitle, l.responsesDesc],
};

/**
 * A section the plan lacks. The plans button shows only where the app itself
 * can sell (canBuy: the same switches as the profile's Subscription row):
 * Android must never point at an outside payment.
 */
function LockedCard({ section, plan, l, canBuy, onOpenPlans }: {
  section: AnalyticsSection; plan: SubscriptionTier; l: Labels; canBuy: boolean; onOpenPlans: () => void;
}) {
  const { colors } = useTheme();
  const [title, desc] = SECTION_TEXT[section](l);
  return (
    <View style={[styles.card, styles.locked, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <View style={styles.lockRow}>
        <Icon name="lock-closed-outline" size={18} color={colors.textTertiary} />
        <Text style={[styles.h2, styles.flex, { color: colors.text }]} accessibilityRole="header">{title}</Text>
      </View>
      <Text style={[styles.muted, { color: colors.textSecondary }]}>{desc}</Text>
      <Text style={[styles.lockedPlan, { color: colors.text }]}>{fill(l.lockedTitle, { plan: PLAN_NAMES[plan] })}</Text>
      {canBuy ? (
        <GradientButton style={styles.cta} onPress={onOpenPlans} accessibilityRole="button">
          <Text style={styles.ctaText}>{l.lockedCta}</Text>
        </GradientButton>
      ) : null}
    </View>
  );
}

export function ProviderAnalyticsView({ data, labels: l, tr, canBuy, onOpenPlans }: {
  data: ProviderAnalytics;
  labels: Labels;
  tr: Tr;
  canBuy: boolean;
  onOpenPlans: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[styles.muted, { color: colors.textSecondary }]}>{l.subtitle}</Text>
      <Text style={[styles.muted, styles.mt8, { color: colors.textSecondary }]}>
        {`${fill(l.yourPlan, { plan: PLAN_NAMES[data.plan] })} · ${l.basicNote}`}
      </Text>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>{fill(l.trackedSince, { date: dmy(data.viewsTrackedSince) })}</Text>
      </View>
      {data.profile ? <ProfileCard data={data.profile} l={l} /> : null}
      {data.advanced ? <AdvancedCard data={data.advanced} l={l} tr={tr} /> : null}
      {data.responses ? <ResponsesCard data={data.responses} l={l} tr={tr} /> : null}
      {data.locked.map((x) => (
        <LockedCard key={x.section} section={x.section} plan={x.plan} l={l} canBuy={canBuy} onOpenPlans={onOpenPlans} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 16 },
  locked: { borderStyle: 'dashed' },
  h2: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  h3: { fontSize: 14, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  muted: { fontSize: 13, lineHeight: 18 },
  small: { fontSize: 11 },
  mt8: { marginTop: 8 },
  mt16: { marginTop: 16 },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: { flex: 1, borderRadius: 12, padding: 12 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 16 },
  tab: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  tabText: { fontSize: 13, fontWeight: '600' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 120, marginTop: 12, borderBottomWidth: 1 },
  chartBar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  chartAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  stack: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1, fontSize: 13 },
  legendValue: { fontSize: 13, fontWeight: '700' },
  gap8: { gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barName: { width: 110, fontSize: 13 },
  monthName: { width: 64, fontSize: 13 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: 'rgba(148,163,184,0.2)', overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  abs: { position: 'absolute', left: 0, top: 0 },
  barValue: { width: 56, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  cellWide: { flex: 2, fontSize: 13 },
  cell: { flex: 1, fontSize: 13, textAlign: 'right' },
  notice: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginTop: 12 },
  noticeText: { color: '#92400E', fontSize: 13, lineHeight: 18 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockedPlan: { fontSize: 14, fontWeight: '600', marginTop: 12 },
  cta: { marginTop: 12, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
