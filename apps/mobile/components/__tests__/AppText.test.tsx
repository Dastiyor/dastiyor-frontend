import { createRef } from 'react';
import { StyleSheet, TextInput as RNTextInput, type TextStyle } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Text, TextInput, FONT_FAMILY } from '../AppText';

const fontOf = (el: { props: { style: unknown } }) => (StyleSheet.flatten(el.props.style as TextStyle) as TextStyle).fontFamily;

test('text uses the brand font', () => {
  render(<Text>Привет</Text>);
  expect(fontOf(screen.getByText('Привет'))).toBe(FONT_FAMILY);
});

test('a style can still set its own font family', () => {
  render(<Text style={{ fontFamily: 'Courier' }}>код</Text>);
  expect(fontOf(screen.getByText('код'))).toBe('Courier');
});

test('text inputs use the brand font and pass their ref through', () => {
  const ref = createRef<RNTextInput>();
  render(<TextInput ref={ref} placeholder="Имя" />);
  expect(fontOf(screen.getByPlaceholderText('Имя'))).toBe(FONT_FAMILY);
  expect(ref.current).toBeTruthy();
});
