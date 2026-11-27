import { useEffect, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/AppText';
import { FullWindowOverlay } from 'react-native-screens';
import { Icon } from '@/components/Icon';
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

export type DialogIcon = 'success' | 'error';

export interface DialogOptions {
    onDismiss?: () => void;
    /**
     * A round badge above the title (✓ on blue / ✕ on red), with the text
     * centred under it. Without it, a dialog titled with t.common.done gets
     * 'success' and one titled t.common.error gets 'error', so most call sites
     * need nothing; pass it for a success titled anything else.
     */
    icon?: DialogIcon;
}

// success: white ✓ in a solid blue circle. error: a red outlined "!" on a soft
// red circle, no fill -- calmer than a red cross for something usually fixable.
const BADGE: Record<DialogIcon, { ring: string; ringDark: string; fill: string | null; glyph: 'checkmark' | 'alert-circle-outline'; glyphColor: string; glyphSize: number }> = {
    success: { ring: '#DBEAFE', ringDark: 'rgba(37,99,235,0.25)', fill: '#2563EB', glyph: 'checkmark', glyphColor: '#FFFFFF', glyphSize: 30 },
    error: { ring: '#FDECEC', ringDark: 'rgba(220,38,38,0.22)', fill: null, glyph: 'alert-circle-outline', glyphColor: '#DC2626', glyphSize: 40 },
};

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
        // Most dialogs follow a form submit with the field still focused, and many buttons then
        // close a modal screen. Closing it while a field is first responder leaves the screen
        // underneath with a dead header back button on iOS, so the keyboard goes now.
        Keyboard.dismiss();
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

    // Titles that mean "this went wrong" across the app; they get the error badge.
    const errorTitles: string[] = [t.common.error, t.login.errTitle, t.login.errOauth, t.register.errRegister];
    const icon: DialogIcon | undefined = current.options?.icon
        ?? (current.title === t.common.done ? 'success' : errorTitles.includes(current.title) ? 'error' : undefined);
    const badge = icon ? BADGE[icon] : null;
    // A bare "Error" says nothing the badge doesn't; say what happened instead.
    const title = icon === 'error' && current.title === t.common.error ? t.common.errorTitle : current.title;

    // With no buttons given, one that says what it does rather than "OK".
    const defaultLabel = icon === 'success' ? t.common.continue : icon === 'error' ? t.common.errorRetry : t.common.ok;
    const buttons: DialogButton[] = current.buttons.length
        ? current.buttons
        : [{ text: defaultLabel, style: 'default' }];
    const cancelButton = buttons.find((b) => b.style === 'cancel');
    // Match RN: tapping outside cancels only when there is something to cancel.
    const dismiss = () => close(cancelButton ? cancelButton.onPress : current.options?.onDismiss);
    // A badge dialog lays its buttons out like a sheet: actions full width, a
    // cancel as a text link under them. Plain dialogs keep the side-by-side row.
    const stacked = !!badge || buttons.length > 2;
    const actions = badge ? buttons.filter((b) => b.style !== 'cancel') : buttons;

    return (
        <DialogPortal onRequestClose={dismiss}>
            <Pressable
                style={[styles.backdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(17,24,39,0.45)' }]}
                onPress={cancelButton ? dismiss : undefined}
            >
                {/* Swallow taps on the card itself. */}
                <Pressable style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => {}}>
                    {badge ? (
                        <View
                            style={[styles.badgeRing, { backgroundColor: isDark ? badge.ringDark : badge.ring }]}
                            accessibilityElementsHidden
                            importantForAccessibility="no-hide-descendants"
                        >
                            <View style={[styles.badge, badge.fill ? { backgroundColor: badge.fill } : null]}>
                                <Icon name={badge.glyph} size={badge.glyphSize} color={badge.glyphColor} />
                            </View>
                        </View>
                    ) : null}
                    <Text style={[styles.title, { color: colors.text }, badge && styles.centred]}>{title}</Text>
                    {current.message ? (
                        <Text style={[styles.message, { color: colors.textSecondary }, badge && styles.centred]}>{current.message}</Text>
                    ) : null}

                    <View style={[styles.actions, stacked && styles.actionsStacked, badge && styles.actionsBadge]}>
                        {actions.map((b, i) => {
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

                    {badge && cancelButton ? (
                        <Pressable onPress={dismiss} accessibilityRole="button" style={styles.cancelLink} hitSlop={8}>
                            <Text style={[styles.cancelLinkText, { color: colors.textSecondary }]}>
                                {cancelButton.text ?? t.common.cancel}
                            </Text>
                        </Pressable>
                    ) : null}

                    {!cancelButton || badge ? null : (
                        <Pressable
                            onPress={dismiss}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel={cancelButton.text ?? t.common.cancel}
                            style={styles.close}
                        >
                            <Icon name="close" size={18} color={colors.textTertiary} />
                        </Pressable>
                    )}
                </Pressable>
            </Pressable>
        </DialogPortal>
    );
}

/**
 * Where the dialog is actually drawn. A plain `Modal` is rendered from the JS
 * root; on iOS a `presentation: 'modal'` screen (respond / review / create-task
 * / edit-profile …) is presented *above* that root, so the `Modal` lands behind
 * it and the dialog is invisible. `FullWindowOverlay` (react-native-screens)
 * renders into a UIWindow above everything, native modals included. On Android
 * the plain `Modal` already stacks correctly, so it stays.
 */
function DialogPortal({
    children,
    onRequestClose,
}: {
    children: React.ReactNode;
    onRequestClose: () => void;
}) {
    if (Platform.OS === 'ios') {
        return <FullWindowOverlay>{children}</FullWindowOverlay>;
    }
    return (
        <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onRequestClose}>
            {children}
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
    badgeRing: { alignSelf: 'center', width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    badge: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
    centred: { textAlign: 'center', paddingRight: 0 },
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
    // Badge dialogs: actions top-down in call order (no reversal), full width.
    actionsBadge: { flexDirection: 'column', marginTop: 22 },
    cancelLink: { alignSelf: 'center', marginTop: 14, paddingVertical: 4 },
    cancelLinkText: { fontSize: 15, fontWeight: '600' },
    buttonText: { fontSize: 15, fontWeight: '700' },
    close: { position: 'absolute', top: 14, right: 14, padding: 4 },
});
