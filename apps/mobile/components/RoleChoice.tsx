import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { GradientButton } from '@/components/Premium';

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
 * default is how providers ended up as customers. Tapping a card selects it
 * (and can be changed); "Get started" below, enabled once a card is selected,
 * is what submits the choice.
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
  const [selected, setSelected] = useState<SignupRole | null>(null);
  const busy = busyRole !== null;

  return (
    <>
      <View style={styles.row}>
        {ROLES.map((rv) => {
          const isSelected = selected === rv;
          return (
            <TouchableOpacity
              key={rv}
              testID={`role-${rv}`}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && { borderColor: TINT[rv].fg, borderWidth: 2, backgroundColor: TINT[rv].bg },
              ]}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); setSelected(rv); }}
              disabled={busy}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityLabel={rv === 'customer' ? r.customerTitle : r.providerTitle}
              accessibilityHint={rv === 'customer' ? r.customerDesc : r.providerDesc}
              accessibilityState={{ disabled: busy, selected: isSelected, checked: isSelected }}
            >
              {isSelected ? (
                <View style={styles.check}>
                  <Icon name="checkmark-circle" size={22} color={TINT[rv].fg} />
                </View>
              ) : null}
              <View style={[styles.icon, { backgroundColor: isSelected ? colors.surface : TINT[rv].bg }]}>
                <Icon name={ICONS[rv]} size={32} color={TINT[rv].fg} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {rv === 'customer' ? r.customerTitle : r.providerTitle}
              </Text>
              <Text style={[styles.desc, { color: colors.textSecondary }]}>
                {rv === 'customer' ? r.customerDesc : r.providerDesc}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{r.advertiseHint}</Text>
      <GradientButton
        testID="role-submit"
        style={[styles.button, (!selected || busy) && styles.buttonDisabled]}
        onPress={() => { if (selected) onPick(selected); }}
        disabled={!selected || busy}
        accessibilityRole="button"
        accessibilityLabel={r.getStarted}
        accessibilityState={{ disabled: !selected || busy, busy }}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{r.getStarted}</Text>}
      </GradientButton>
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
  hint: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: 20 },
  check: { position: 'absolute', top: 10, right: 10 },
  button: { borderRadius: 14, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
