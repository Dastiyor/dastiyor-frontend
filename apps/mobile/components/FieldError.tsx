import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { Text } from '@/components/AppText';

/** Red border colour for a field that has an error. */
export const FIELD_ERROR_COLOR = '#DC2626';

/**
 * The red line under a form field saying what is wrong with it -- shown in
 * place of an alert, so the message sits next to the field it is about.
 * Renders nothing without a message. Read out by screen readers when it appears.
 */
export function FieldError({ message, style }: { message?: string | null; style?: StyleProp<TextStyle> }) {
  if (!message) return null;
  return (
    <Text style={[styles.text, style]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { color: FIELD_ERROR_COLOR, fontSize: 12, marginTop: -8, marginBottom: 12, marginLeft: 4 },
});
