import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOAST_HIDE_DELAY_MS } from '@/lib/constants';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface BannerItem {
  id: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress?: () => void;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
  showBanner: (title: string, subtitle: string, icon?: React.ComponentProps<typeof Ionicons>['name'], onPress?: () => void) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_COLORS: Record<ToastType, { bg: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  success: { bg: '#059669', icon: 'checkmark-circle' },
  error:   { bg: '#DC2626', icon: 'alert-circle' },
  info:    { bg: '#2563EB', icon: 'information-circle' },
};

const BANNER_HIDE_MS = 4500;

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

  const { bg, icon } = TOAST_COLORS[item.type];

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

function BannerItem({ item, topInset: _topInset, onHide }: { item: BannerItem; topInset: number; onHide: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;

  const hide = useCallback(() => {
    Animated.spring(anim, { toValue: 0, useNativeDriver: true, speed: 20 }).start(onHide);
  }, []);

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 4 }).start(() => {
      setTimeout(hide, BANNER_HIDE_MS);
    });
  }, []);

  const content = (
    <Animated.View
      style={[
        styles.banner,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }],
        },
      ]}
    >
      <View style={styles.bannerIconWrap}>
        <Ionicons name={item.icon} size={22} color="#2563EB" />
      </View>
      <View style={styles.bannerBody}>
        <Text style={styles.bannerTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.bannerSubtitle} numberOfLines={2}>{item.subtitle}</Text>
      </View>
      <TouchableOpacity onPress={hide} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Ionicons name="close" size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </Animated.View>
  );

  if (item.onPress) {
    return (
      <TouchableOpacity onPress={() => { item.onPress?.(); hide(); }} activeOpacity={0.9}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

let _counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_counter;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
  }, []);

  const showBanner = useCallback((
    title: string,
    subtitle: string,
    icon: React.ComponentProps<typeof Ionicons>['name'] = 'notifications',
    onPress?: () => void,
  ) => {
    const id = ++_counter;
    // Only keep 1 banner at a time
    setBanners([{ id, icon, title, subtitle, onPress }]);
  }, []);

  return (
    <ToastContext.Provider value={{ show, showBanner }}>
      {children}
      {/* Top banners — container positioned at very top of screen */}
      {banners.length > 0 && (
        <View style={[styles.bannerContainer, { top: insets.top + 8 }]} pointerEvents="box-none">
          {banners.map((item) => (
            <BannerItem
              key={item.id}
              item={item}
              topInset={0}
              onHide={() => setBanners((prev) => prev.filter((b) => b.id !== item.id))}
            />
          ))}
        </View>
      )}
      {/* Bottom toasts */}
      <View style={styles.toastContainer} pointerEvents="none">
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
  toastContainer: {
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

  bannerContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 10000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  bannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerBody: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  bannerSubtitle: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
});
