import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export type SignupRole = 'customer' | 'provider';

const ROLES: SignupRole[] = ['customer', 'provider'];
const ICONS = { customer: 'clipboard-outline', provider: 'construct-outline' } as const;
const TINT = {
  customer: { bg: '#EFF6FF', fg: '#2563EB' },
  provider: { bg: '#FFF7ED', fg: '#EA580C' },
} as const;

/**
 * The customer / provider choice that ends signup, after the phone is verified
 * or Google / Apple has signed a new person in. Nothing is preselected: a
 * default is how providers ended up as customers. Tapping a card is the choice.
 */
export function RoleChoice({
  onPick,
  busyRole,
}: {
  onPick: (role: SignupRole) => void;
  /** The role being submitted; both cards are disabled meanwhile. */
  busyRole: SignupRole | null;
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const r = t.register;

  return (
    <>
      <View style={styles.row}>
        {ROLES.map((rv) => (
          <TouchableOpacity
            key={rv}
            testID={`role-${rv}`}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: busyRole === rv ? TINT[rv].fg : colors.border }]}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); onPick(rv); }}
            disabled={busyRole !== null}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={rv === 'customer' ? r.customerTitle : r.providerTitle}
            accessibilityHint={rv === 'customer' ? r.customerDesc : r.providerDesc}
            accessibilityState={{ disabled: busyRole !== null, busy: busyRole === rv }}
          >
            <View style={[styles.icon, { backgroundColor: TINT[rv].bg }]}>
              {busyRole === rv
                ? <ActivityIndicator color={TINT[rv].fg} />
                : <Icon name={ICONS[rv]} size={32} color={TINT[rv].fg} />}
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {rv === 'customer' ? r.customerTitle : r.providerTitle}
            </Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              {rv === 'customer' ? r.customerDesc : r.providerDesc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{r.advertiseHint}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  card: {
    flex: 1, minHeight: 240, borderWidth: 1.5, borderRadius: 18,
    paddingVertical: 20, paddingHorizontal: 12, alignItems: 'center',
  },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  hint: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
