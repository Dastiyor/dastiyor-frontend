import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LOCALE_NAMES, type Locale } from '@/lib/i18n';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingItem {
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
  label: string;
  onPress: () => void;
}

function SettingsRow({ icon, iconBg, iconColor, label, onPress }: SettingItem) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const LOCALES: Locale[] = ['ru', 'tj', 'en'];

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme, theme } = useTheme();
  const { locale, setLocale, t } = useLanguage();
  const p = t.profile;
  const [search, setSearch] = useState('');

  const generalItems: SettingItem[] = [
    { icon: 'person-outline', iconBg: 'rgba(37,99,235,0.12)', iconColor: '#2563EB', label: 'Personal info', onPress: () => router.push('/edit-profile') },
    { icon: 'lock-closed-outline', iconBg: 'rgba(124,58,237,0.12)', iconColor: '#7C3AED', label: 'Privacy', onPress: () => {} },
    { icon: 'notifications-outline', iconBg: 'rgba(245,158,11,0.12)', iconColor: '#F59E0B', label: 'Notifications', onPress: () => {} },
    { icon: 'bar-chart-outline', iconBg: 'rgba(16,185,129,0.12)', iconColor: '#10B981', label: 'Limits', onPress: () => {} },
    { icon: 'card-outline', iconBg: 'rgba(239,68,68,0.12)', iconColor: '#EF4444', label: 'Card linking', onPress: () => {} },
  ];

  const filteredGeneral = search
    ? generalItems.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : generalItems;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader title="Settings" showBack showMenu={false} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* General section */}
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>General</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {filteredGeneral.map((item) => (
            <SettingsRow key={item.label} {...item} />
          ))}
        </View>

        {/* Appearance section */}
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* Language */}
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: 'rgba(124,58,237,0.12)' }]}>
              <Ionicons name="language-outline" size={20} color="#7C3AED" />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Language</Text>
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
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={20} color="#10B981" />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
              <Text style={[styles.themeValue, { color: colors.textSecondary }]}>{isDark ? 'Dark' : 'Light'}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>

          {/* Welcome screen */}
          <TouchableOpacity activeOpacity={0.6}>
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                <Ionicons name="image-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Welcome screen</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>

          {/* Search bar */}
          <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textTertiary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search for settings"
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Gesture control */}
          <TouchableOpacity activeOpacity={0.6}>
            <View style={[styles.row, { borderBottomColor: 'transparent' }]}>
              <View style={[styles.rowIcon, { backgroundColor: 'rgba(37,99,235,0.12)' }]}>
                <Ionicons name="phone-portrait-outline" size={20} color="#2563EB" />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Gesture control</Text>
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
  searchRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
});
