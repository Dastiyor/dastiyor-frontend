import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Locale } from '@/lib/i18n';

const OPTIONS: { locale: Locale; label: string; sub: string }[] = [
  { locale: 'ru', label: 'Русский', sub: 'Russian' },
  { locale: 'tj', label: 'Тоҷикӣ', sub: 'Tajik' },
  { locale: 'en', label: 'English', sub: 'English' },
];

const CODE: Record<Locale, string> = { ru: 'RU', tj: 'TJ', en: 'EN' };

/** A small globe + language code pill that opens a language picker. */
export function LanguageButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { locale, setLocale, t } = useLanguage();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  async function pick(loc: Locale) {
    await setLocale(loc);
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t.onboarding.langTitle}
      >
        <Icon name="globe-outline" size={16} color={colors.accent} />
        <Text style={[styles.btnText, { color: colors.accent }]}>{CODE[locale]}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>{t.onboarding.langTitle}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t.common.cancel}>
                <Icon name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {OPTIONS.map((opt) => {
              const active = locale === opt.locale;
              return (
                <TouchableOpacity
                  key={opt.locale}
                  style={[styles.option, { borderColor: active ? colors.accent : colors.border }]}
                  onPress={() => pick(opt.locale)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active, checked: active }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, { color: active ? colors.accent : colors.text }]}>{opt.label}</Text>
                    <Text style={[styles.optionSub, { color: colors.textTertiary }]}>{opt.sub}</Text>
                  </View>
                  {active && <Icon name="checkmark" size={18} color={colors.accent} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 999, borderWidth: 1,
  },
  btnText: { fontSize: 13, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 20, padding: 20, gap: 10, width: '100%', maxWidth: 420, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '700' },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  optionLabel: { fontSize: 16, fontWeight: '600' },
  optionSub: { fontSize: 12, marginTop: 2 },
});
