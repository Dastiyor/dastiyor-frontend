import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { captureException } from '@/lib/errorReporting';

interface Props extends React.PropsWithChildren {
  title?: string;
  retryText?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureException(error, { componentStack: info.componentStack, source: 'ErrorBoundary' });
  }

  render() {
    if (this.state.hasError) {
      const title = this.props.title ?? 'Что-то пошло не так';
      const retryText = this.props.retryText ?? 'Попробовать снова';
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>{title}</Text>
          {this.state.error?.message ? (
            <Text style={styles.message}>{this.state.error.message}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ hasError: false, error: null })}
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
  return (
    <ErrorBoundaryClass title={t.common.errorTitle} retryText={t.common.errorRetry}>
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
    backgroundColor: '#fff',
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  btn: { backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
