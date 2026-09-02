import { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

/** Password field with a show/hide toggle. Same treatment as the auth screens. */
export function PasswordInput(props: Omit<TextInputProps, 'secureTextEntry'>) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <TextInput
        {...props}
        style={[styles.input, { color: colors.text }, props.style]}
        placeholderTextColor={props.placeholderTextColor ?? colors.textTertiary}
        secureTextEntry={!visible}
        maxLength={props.maxLength ?? 128}
      />
      <TouchableOpacity
        style={styles.eyeBtn}
        onPress={() => setVisible((v) => !v)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={visible ? t.common.hidePassword : t.common.showPassword}
      >
        <Ionicons name={visible ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
  },
  input: { flex: 1, padding: 14, fontSize: 15, letterSpacing: 0 },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 10 },
});
