// iconsax-react-native ships one CommonJS file per icon; importing those keeps the other ~1,000 out of the bundle.
declare module 'iconsax-react-native/dist/cjs/*' {
  import type { Icon } from 'iconsax-react-native';
  const I: Icon;
  export default I;
}
