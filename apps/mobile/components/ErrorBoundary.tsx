import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { captureException } from '@/lib/errorReporting';

interface Props extends React.PropsWithChildren {
  title?: string;
  subtitle?: string;
  retryText?: string;
}

interface State {
  hasError: boolean;
}

class ErrorBoundaryClass extends React.Component<
  Props & { bg?: string; text?: string; textSecondary?: string; accent?: string },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureException(error, { componentStack: info.componentStack, source: 'ErrorBoundary' });
  }

  render() {
    if (this.state.hasError) {
      const title = this.props.title ?? 'Something went wrong';
      const subtitle = this.props.subtitle ?? '';
      const retryText = this.props.retryText ?? 'Try again';
      const {
        bg = '#FFFFFF',
        text = '#111827',
        textSecondary = '#6B7280',
        accent = '#2563EB',
      } = this.props;
      return (
        <View style={[styles.container, { backgroundColor: bg }]}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={[styles.title, { color: text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.message, { color: textSecondary }]}>{subtitle}</Text> : null}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: accent }]}
            onPress={() => this.setState({ hasError: false })}
            accessibilityRole="button"
            accessibilityLabel={retryText}
          >
            <Text style={styles.btnText}>{retryText}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary({ children }: React.PropsWithChildren) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  return (
    <ErrorBoundaryClass
      title={t.common.errorTitle}
      subtitle={t.common.errorSubtitle}
      retryText={t.common.errorRetry}
      bg={colors.bg}
      text={colors.text}
      textSecondary={colors.textSecondary}
      accent={colors.accent}
    >
      {children}
    </ErrorBoundaryClass>
  );
}

export { ErrorBoundaryClass };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  btn: { borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
