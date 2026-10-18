import { forwardRef } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextProps,
  type TextInputProps,
} from 'react-native';

// The brand font, embedded at build time by the expo-font plugin in app.json
// (all weights under one family, so fontWeight picks the right file on both platforms).
// React Native has no global default font, so every screen imports Text/TextInput from here.
export const FONT_FAMILY = 'Manrope';

export const Text = forwardRef<RNText, TextProps>(function Text(props, ref) {
  return <RNText ref={ref} {...props} style={[{ fontFamily: FONT_FAMILY }, props.style]} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  return <RNTextInput ref={ref} {...props} style={[{ fontFamily: FONT_FAMILY }, props.style]} />;
});

