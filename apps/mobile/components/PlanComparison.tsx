import { View, StyleSheet } from 'react-native';
import type { SubscriptionTier } from '@dastiyor/types';
import { Text } from '@/components/AppText';
import { TierBadge } from '@/components/TierBadge';
import { useTheme } from '@/contexts/ThemeContext';

type Tier = 'free' | SubscriptionTier;
const TIERS: Tier[] = ['free', 'pro', 'pro_plus', 'business'];

export type CompareRow =
  | 'badge' | 'visibility' | 'promotions' | 'pin' | 'alerts' | 'analytics'
  | 'responseStats' | 'recommended' | 'highlight' | 'support';
export type CompareValue =
  | 'standard' | 'higher' | 'higher2' | 'max' | 'after15' | 'instant' | 'extended' | 'advanced'
  | 'catalog' | 'catalogSearch' | 'supStandard' | 'supPriority' | 'supPersonal';

export interface CompareLabels {
  title: string;
  howTitle: string;
  how: readonly string[];
  rows: Record<CompareRow, string>;
  values: Record<CompareValue, string>;
}

/** A cell: the plan's badge, a number, a word, yes (✓) or no (—). */
type Cell = 'badge' | 'yes' | 'no' | number | CompareValue;

/**
 * What each plan unlocks, as the code does it (web lib/plans.ts, lib/task-alerts.ts,
 * lib/provider-analytics.ts, lib/promotions.ts). Change a plan there, change it here.
 */
const TABLE: [CompareRow, Record<Tier, Cell>][] = [
  ['badge', { free: 'no', pro: 'badge', pro_plus: 'badge', business: 'badge' }],
  ['visibility', { free: 'standard', pro: 'higher', pro_plus: 'higher2', business: 'max' }],
  ['promotions', { free: 'no', pro: 1, pro_plus: 2, business: 5 }],
  ['pin', { free: 'no', pro: 'no', pro_plus: 'no', business: 'yes' }],
  ['alerts', { free: 'no', pro: 'after15', pro_plus: 'instant', business: 'instant' }],
  ['analytics', { free: 'no', pro: 'no', pro_plus: 'extended', business: 'advanced' }],
  ['responseStats', { free: 'no', pro: 'no', pro_plus: 'no', business: 'yes' }],
  ['recommended', { free: 'no', pro: 'no', pro_plus: 'no', business: 'yes' }],
  ['highlight', { free: 'no', pro: 'no', pro_plus: 'catalog', business: 'catalogSearch' }],
  ['support', { free: 'no', pro: 'supStandard', pro_plus: 'supPriority', business: 'supPersonal' }],
];

/**
 * Side-by-side comparison of FREE / PRO / PRO+ / BUSINESS with the real badges, then
 * short notes on how promotions, pinning, alerts and analytics work. Information only:
 * no price, button or link, so it is safe on Android, which cannot sell plans.
 */
export function PlanComparison({ labels: l, current }: { labels: CompareLabels; current: SubscriptionTier | null }) {
  const { colors } = useTheme();
  const currentTier: Tier = current ?? 'free';
  const column = (tier: Tier) => [styles.cell, tier === currentTier && { backgroundColor: colors.accent + '22' }];

  const render = (tier: Tier, cell: Cell) => {
    if (cell === 'badge') return tier === 'free' ? null : <TierBadge tier={tier} />;
    if (cell === 'yes') return <Text style={[styles.value, { color: '#16A34A' }]}>✓</Text>;
    if (cell === 'no') return <Text style={[styles.value, { color: colors.textTertiary }]}>—</Text>;
    const text = typeof cell === 'number' ? String(cell) : l.values[cell];
    // Long words ("Приоритетная", "Расширенная") shrink to fit their column instead of breaking.
    return <Text style={[styles.value, { color: colors.text }]} numberOfLines={text.includes(' ') ? 2 : 1} adjustsFontSizeToFit minimumFontScale={0.6}>{text}</Text>;
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{l.title}</Text>
        <View style={styles.row}>
          {TIERS.map((tier) => (
            <View key={tier} style={column(tier)}>
              <Text style={[styles.head, { color: colors.text }]}>{tier === 'free' ? 'FREE' : tier === 'pro' ? 'PRO' : tier === 'pro_plus' ? 'PRO+' : 'BUSINESS'}</Text>
            </View>
          ))}
        </View>
        {TABLE.map(([row, cells]) => (
          <View key={row} style={[styles.line, { borderTopColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{l.rows[row]}</Text>
            <View style={styles.row}>
              {TIERS.map((tier) => <View key={tier} style={column(tier)}>{render(tier, cells[tier])}</View>)}
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{l.howTitle}</Text>
        {l.how.map((note) => <Text key={note} style={[styles.note, { color: colors.textSecondary }]}>{note}</Text>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 8 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row' },
  line: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 6 },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, paddingHorizontal: 3, borderRadius: 8, minHeight: 28 },
  head: { fontSize: 12, fontWeight: '800' },
  label: { fontSize: 13 },
  value: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  note: { fontSize: 13, lineHeight: 19 },
});
