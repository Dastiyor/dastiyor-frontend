import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOAST_HIDE_DELAY_MS } from '@/lib/constants';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const COLORS: Record<ToastType, { bg: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  success: { bg: '#059669', icon: 'checkmark-circle' },
  error:   { bg: '#DC2626', icon: 'alert-circle' },
  info:    { bg: '#2563EB', icon: 'information-circle' },
};

function ToastItem({ item, onHide }: { item: ToastItem; onHide: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(onHide);
  }, []);

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }).start(() => {
      setTimeout(hide, TOAST_HIDE_DELAY_MS);
    });
  }, []);

  const { bg, icon } = COLORS[item.type];

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: bg },
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
      ]}
    >
      <Ionicons name={icon} size={18} color="#fff" />
      <Text style={styles.toastText} numberOfLines={3}>{item.message}</Text>
    </Animated.View>
  );
}

let _counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_counter;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map((item) => (
          <ToastItem
            key={item.id}
            item={item}
            onHide={() => setToasts((prev) => prev.filter((t) => t.id !== item.id))}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toastText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
