import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LOCALE_NAMES, type Locale } from '@/lib/i18n';

const LOCALES: Locale[] = ['ru', 'tj', 'en'];

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLanguage();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t.settings?.title ?? 'Settings'} showBack />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>{t.settings?.appearance ?? 'Appearance'}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>

          {/* Language */}
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: 'rgba(124,58,237,0.12)' }]}>
              <Ionicons name="language-outline" size={20} color="#7C3AED" />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{t.settings?.language ?? 'Language'}</Text>
            <View style={styles.pills}>
              {LOCALES.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.pill, { borderColor: locale === loc ? colors.accent : colors.border, backgroundColor: locale === loc ? colors.iconBg : 'transparent' }]}
                  onPress={() => setLocale(loc)}
                >
                  <Text style={[styles.pillText, { color: locale === loc ? colors.accent : colors.textSecondary }]}>
                    {LOCALE_NAMES[loc]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Theme */}
          <TouchableOpacity onPress={toggleTheme} activeOpacity={0.6}>
            <View style={[styles.row, { borderBottomColor: 'transparent' }]}>
              <View style={[styles.rowIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={20} color="#10B981" />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t.settings?.theme ?? 'Theme'}</Text>
              <Text style={[styles.themeValue, { color: colors.textSecondary }]}>{isDark ? (t.settings?.dark ?? 'Dark') : (t.settings?.light ?? 'Light')}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  card: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  pills: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1.5 },
  pillText: { fontSize: 12, fontWeight: '600' },
  themeValue: { fontSize: 13, marginRight: 6 },
});
