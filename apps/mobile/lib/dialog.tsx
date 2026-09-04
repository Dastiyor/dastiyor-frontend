import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Drop-in replacement for react-native's `Alert`, drawn in the app's own style
 * instead of the OS one. Call sites keep RN's signature -- swapping the import
 * is the whole migration:
 *
 *   import { Alert } from '@/lib/dialog';
 *
 * Beyond looks this fixes an iOS problem the native Alert has here: several
 * screens navigate from inside an onPress handler while sitting under a modal
 * screen, and a native alert torn down mid-transition leaves the view
 * hierarchy unresponsive. Handlers here run one frame after the dialog is
 * already gone.
 */

export type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export interface DialogButton {
    text?: string;
    onPress?: () => void;
    style?: DialogButtonStyle;
}

export interface DialogOptions {
    onDismiss?: () => void;
}

interface DialogRequest {
    title: string;
    message?: string;
    buttons: DialogButton[];
    options?: DialogOptions;
}

type Listener = (queue: DialogRequest[]) => void;

let queue: DialogRequest[] = [];
let listener: Listener | null = null;

function publish() {
    listener?.(queue);
}

function enqueue(req: DialogRequest) {
    queue = [...queue, req];
    publish();
}

export const Alert = {
    alert(title: string, message?: string, buttons?: DialogButton[], options?: DialogOptions) {
        enqueue({ title, message, buttons: buttons?.length ? buttons : [], options });
    },
};

/** Mount once, above every screen. */
export function DialogHost() {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const [current, setCurrent] = useState<DialogRequest | null>(null);

    useEffect(() => {
        listener = (q) => setCurrent(q[0] ?? null);
        listener(queue);
        // The host owns the queue's lifetime -- nothing can show it once this
        // unmounts, so a leftover request would only reappear on a remount.
        return () => { listener = null; queue = []; };
    }, []);

    function close(action?: () => void) {
        queue = queue.slice(1);
        setCurrent(null);
        // Next frame: the dialog is off screen before a handler can navigate.
        requestAnimationFrame(() => {
            action?.();
            publish();
        });
    }

    if (!current) return null;

    const buttons: DialogButton[] = current.buttons.length
        ? current.buttons
        : [{ text: t.common.ok, style: 'default' }];
    const cancelButton = buttons.find((b) => b.style === 'cancel');
    // Match RN: tapping outside cancels only when there is something to cancel.
    const dismiss = () => close(cancelButton ? cancelButton.onPress : current.options?.onDismiss);
    const stacked = buttons.length > 2;

    return (
        <Modal
            transparent
            visible
            animationType="fade"
            statusBarTranslucent
            onRequestClose={dismiss}
        >
            <Pressable
                style={[styles.backdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(17,24,39,0.45)' }]}
                onPress={cancelButton ? dismiss : undefined}
            >
                {/* Swallow taps on the card itself. */}
                <Pressable style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => {}}>
                    <Text style={[styles.title, { color: colors.text }]}>{current.title}</Text>
                    {current.message ? (
                        <Text style={[styles.message, { color: colors.textSecondary }]}>{current.message}</Text>
                    ) : null}

                    <View style={[styles.actions, stacked && styles.actionsStacked]}>
                        {buttons.map((b, i) => {
                            const destructive = b.style === 'destructive';
                            const cancel = b.style === 'cancel';
                            const bg = destructive ? '#DC2626' : cancel ? 'transparent' : colors.accent;
                            const fg = cancel ? colors.textSecondary : '#FFFFFF';
                            return (
                                <Pressable
                                    key={`${b.text ?? i}-${i}`}
                                    onPress={() => close(b.onPress)}
                                    accessibilityRole="button"
                                    style={({ pressed }) => [
                                        styles.button,
                                        stacked && styles.buttonStacked,
                                        { backgroundColor: bg, opacity: pressed ? 0.75 : 1 },
                                        cancel && { borderWidth: 1, borderColor: colors.border },
                                    ]}
                                >
                                    <Text style={[styles.buttonText, { color: fg }]} numberOfLines={1}>
                                        {b.text ?? t.common.ok}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {!cancelButton ? null : (
                        <Pressable
                            onPress={dismiss}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel={cancelButton.text ?? t.common.cancel}
                            style={styles.close}
                        >
                            <Ionicons name="close" size={18} color={colors.textTertiary} />
                        </Pressable>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
    card: {
        width: '100%',
        maxWidth: 380,
        borderRadius: 20,
        paddingHorizontal: 22,
        paddingTop: 24,
        paddingBottom: 18,
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 12 },
        elevation: 16,
    },
    title: { fontSize: 18, fontWeight: '800', marginBottom: 8, paddingRight: 24 },
    message: { fontSize: 14, lineHeight: 21, marginBottom: 4 },
    // Two buttons sit side by side in call order (cancel first, so it lands on
    // the left). Three or more stack, reversed, so cancel ends up at the bottom
    // the way the platform alerts put it.
    actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    actionsStacked: { flexDirection: 'column-reverse' },
    button: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonStacked: { flex: 0, width: '100%' },
    buttonText: { fontSize: 15, fontWeight: '700' },
    close: { position: 'absolute', top: 14, right: 14, padding: 4 },
});
