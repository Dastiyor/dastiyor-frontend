import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Icon as IconsaxIcon, IconProps } from 'iconsax-react-native';
import Add from 'iconsax-react-native/dist/cjs/Add';
import ArrowDown from 'iconsax-react-native/dist/cjs/ArrowDown';
import ArrowLeft2 from 'iconsax-react-native/dist/cjs/ArrowLeft2';
import ArrowRight from 'iconsax-react-native/dist/cjs/ArrowRight';
import ArrowRight2 from 'iconsax-react-native/dist/cjs/ArrowRight2';
import ArrowUp from 'iconsax-react-native/dist/cjs/ArrowUp';
import Briefcase from 'iconsax-react-native/dist/cjs/Briefcase';
import Calendar from 'iconsax-react-native/dist/cjs/Calendar';
import Call from 'iconsax-react-native/dist/cjs/Call';
import Camera from 'iconsax-react-native/dist/cjs/Camera';
import ClipboardText from 'iconsax-react-native/dist/cjs/ClipboardText';
import Clock from 'iconsax-react-native/dist/cjs/Clock';
import CloseCircle from 'iconsax-react-native/dist/cjs/CloseCircle';
import CloudCross from 'iconsax-react-native/dist/cjs/CloudCross';
import Code from 'iconsax-react-native/dist/cjs/Code';
import Code1 from 'iconsax-react-native/dist/cjs/Code1';
import Colorfilter from 'iconsax-react-native/dist/cjs/Colorfilter';
import Cpu from 'iconsax-react-native/dist/cjs/Cpu';
import Danger from 'iconsax-react-native/dist/cjs/Danger';
import DocumentText from 'iconsax-react-native/dist/cjs/DocumentText';
import Drop from 'iconsax-react-native/dist/cjs/Drop';
import Edit2 from 'iconsax-react-native/dist/cjs/Edit2';
import Eye from 'iconsax-react-native/dist/cjs/Eye';
import EyeSlash from 'iconsax-react-native/dist/cjs/EyeSlash';
import Flash from 'iconsax-react-native/dist/cjs/Flash';
import Gallery from 'iconsax-react-native/dist/cjs/Gallery';
import Global from 'iconsax-react-native/dist/cjs/Global';
import Headphone from 'iconsax-react-native/dist/cjs/Headphone';
import Home2 from 'iconsax-react-native/dist/cjs/Home2';
import InfoCircle from 'iconsax-react-native/dist/cjs/InfoCircle';
import LanguageSquare from 'iconsax-react-native/dist/cjs/LanguageSquare';
import Lifebuoy from 'iconsax-react-native/dist/cjs/Lifebuoy';
import Link from 'iconsax-react-native/dist/cjs/Link';
import Location from 'iconsax-react-native/dist/cjs/Location';
import Lock from 'iconsax-react-native/dist/cjs/Lock';
import Logout from 'iconsax-react-native/dist/cjs/Logout';
import MagicStar from 'iconsax-react-native/dist/cjs/MagicStar';
import MedalStar from 'iconsax-react-native/dist/cjs/MedalStar';
import Message from 'iconsax-react-native/dist/cjs/Message';
import MessageQuestion from 'iconsax-react-native/dist/cjs/MessageQuestion';
import MessageText1 from 'iconsax-react-native/dist/cjs/MessageText1';
import Messages2 from 'iconsax-react-native/dist/cjs/Messages2';
import Mobile from 'iconsax-react-native/dist/cjs/Mobile';
import Monitor from 'iconsax-react-native/dist/cjs/Monitor';
import Moon from 'iconsax-react-native/dist/cjs/Moon';
import Musicnote from 'iconsax-react-native/dist/cjs/Musicnote';
import Notification from 'iconsax-react-native/dist/cjs/Notification';
import Profile2User from 'iconsax-react-native/dist/cjs/Profile2User';
import ProfileCircle from 'iconsax-react-native/dist/cjs/ProfileCircle';
import RecordCircle from 'iconsax-react-native/dist/cjs/RecordCircle';
import Scissor from 'iconsax-react-native/dist/cjs/Scissor';
import SearchNormal1 from 'iconsax-react-native/dist/cjs/SearchNormal1';
import Send2 from 'iconsax-react-native/dist/cjs/Send2';
import Setting2 from 'iconsax-react-native/dist/cjs/Setting2';
import Setting4 from 'iconsax-react-native/dist/cjs/Setting4';
import Share from 'iconsax-react-native/dist/cjs/Share';
import ShieldTick from 'iconsax-react-native/dist/cjs/ShieldTick';
import Sms from 'iconsax-react-native/dist/cjs/Sms';
import Star1 from 'iconsax-react-native/dist/cjs/Star1';
import Stop from 'iconsax-react-native/dist/cjs/Stop';
import Sun1 from 'iconsax-react-native/dist/cjs/Sun1';
import Teacher from 'iconsax-react-native/dist/cjs/Teacher';
import Text from 'iconsax-react-native/dist/cjs/Text';
import TickCircle from 'iconsax-react-native/dist/cjs/TickCircle';
import TickSquare from 'iconsax-react-native/dist/cjs/TickSquare';
import Trash from 'iconsax-react-native/dist/cjs/Trash';
import TruckFast from 'iconsax-react-native/dist/cjs/TruckFast';
import User from 'iconsax-react-native/dist/cjs/User';

type Variant = NonNullable<IconProps['variant']>;
type Props = { name: IconName; size?: number; color?: string; variant?: Variant; style?: StyleProp<ViewStyle> };

// Iconsax has no bare tick or cross, so these two are drawn to match its 1.5px rounded stroke.
function Stroke(d: string): IconsaxIcon {
  return function StrokeIcon({ size, color, style }) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
        <Path d={d} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  };
}

/**
 * Ionicons-style names → Iconsax (the set most Dribbble app designs use). Outline names draw the thin
 * Linear style; filled names draw the two-tone Bulk style (Bold where a solid shape reads better).
 */
const ICONS = {
  'arrow-down': [ArrowDown, 'Linear'],
  'arrow-forward': [ArrowRight, 'Linear'],
  'arrow-up': [ArrowUp, 'Linear'],
  'bicycle-outline': [TruckFast, 'Linear'],
  'briefcase-outline': [Briefcase, 'Linear'],
  'bug': [Danger, 'Bulk'],
  'calendar-outline': [Calendar, 'Linear'],
  'call-outline': [Call, 'Linear'],
  'camera-outline': [Camera, 'Linear'],
  'chatbubble-ellipses': [MessageText1, 'Bulk'],
  'chatbubble-ellipses-outline': [MessageText1, 'Linear'],
  'chatbubble-outline': [Message, 'Linear'],
  'chatbubbles': [Messages2, 'Bulk'],
  'chatbubbles-outline': [Messages2, 'Linear'],
  'checkbox': [TickSquare, 'Bold'],
  'square-outline': [Stop, 'Linear'],
  'checkmark-circle': [TickCircle, 'Bold'],
  'chevron-back': [ArrowLeft2, 'Linear'],
  'chevron-forward': [ArrowRight2, 'Linear'],
  'clipboard': [ClipboardText, 'Bulk'],
  'clipboard-outline': [ClipboardText, 'Linear'],
  'close-circle': [CloseCircle, 'Bold'],
  'cloud-offline-outline': [CloudCross, 'Linear'],
  'code': [Code, 'Linear'],
  'color-palette-outline': [Colorfilter, 'Linear'],
  'construct-outline': [Setting2, 'Linear'],
  'cut-outline': [Scissor, 'Linear'],
  'desktop-outline': [Monitor, 'Linear'],
  'document-text': [DocumentText, 'Bulk'],
  'document-text-outline': [DocumentText, 'Linear'],
  'eye-off-outline': [EyeSlash, 'Linear'],
  'eye-outline': [Eye, 'Linear'],
  'flash-outline': [Flash, 'Linear'],
  'globe-outline': [Global, 'Linear'],
  'hand-left-outline': [Send2, 'Linear'],
  'hardware-chip-outline': [Cpu, 'Linear'],
  'headset-outline': [Headphone, 'Linear'],
  'help-buoy-outline': [Lifebuoy, 'Linear'],
  'help-circle': [MessageQuestion, 'Bulk'],
  'home': [Home2, 'Bulk'],
  'home-outline': [Home2, 'Linear'],
  'images': [Gallery, 'Bulk'],
  'images-outline': [Gallery, 'Linear'],
  'information-circle': [InfoCircle, 'Bulk'],
  'language-outline': [LanguageSquare, 'Linear'],
  'laptop-outline': [Code1, 'Linear'],
  'link': [Link, 'Linear'],
  'location-outline': [Location, 'Linear'],
  'lock-closed-outline': [Lock, 'Linear'],
  'log-out-outline': [Logout, 'Linear'],
  'mail-outline': [Sms, 'Linear'],
  'moon-outline': [Moon, 'Linear'],
  'musical-notes-outline': [Musicnote, 'Linear'],
  'notifications': [Notification, 'Bulk'],
  'notifications-outline': [Notification, 'Linear'],
  'options-outline': [Setting4, 'Linear'],
  'pencil': [Edit2, 'Linear'],
  'people': [Profile2User, 'Bulk'],
  'people-outline': [Profile2User, 'Linear'],
  'person-circle-outline': [ProfileCircle, 'Linear'],
  'person-outline': [User, 'Linear'],
  'phone-portrait-outline': [Mobile, 'Linear'],
  'radio': [RecordCircle, 'Bold'],
  'ribbon': [MedalStar, 'Bold'],
  'ribbon-outline': [MedalStar, 'Linear'],
  'school-outline': [Teacher, 'Linear'],
  'search': [SearchNormal1, 'Linear'],
  'search-outline': [SearchNormal1, 'Linear'],
  'share-social': [Share, 'Bulk'],
  'shield-checkmark': [ShieldTick, 'Bulk'],
  'shield-checkmark-outline': [ShieldTick, 'Linear'],
  'sparkles-outline': [MagicStar, 'Linear'],
  'star': [Star1, 'Bold'],
  'star-outline': [Star1, 'Linear'],
  'sunny-outline': [Sun1, 'Linear'],
  'text': [Text, 'Linear'],
  'time-outline': [Clock, 'Linear'],
  'trash-outline': [Trash, 'Linear'],
  'water-outline': [Drop, 'Linear'],
  'add': [Add, 'Linear'],
  'close': [Stroke('M6 6l12 12M18 6 6 18'), 'Linear'],
  'checkmark': [Stroke('m5 12.5 4.5 4.5L19 7.5'), 'Linear'],
} satisfies Record<string, [IconsaxIcon, Variant]>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, color = '#000', variant, style }: Props) {
  const [Glyph, fallback] = ICONS[name];
  // All three props passed explicitly: the package relies on defaultProps, which React 19 ignores.
  return <Glyph size={size} color={color} variant={variant ?? fallback} style={style} />;
}
