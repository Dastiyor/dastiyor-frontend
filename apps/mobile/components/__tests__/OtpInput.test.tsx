import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OtpInput } from '../OtpInput';

function Harness({ onChange }: { onChange?: (v: string) => void }) {
  const [code, setCode] = useState('');
  return <OtpInput value={code} onChangeText={(v) => { setCode(v); onChange?.(v); }} accessibilityLabel="Code from SMS" />;
}
const setup = (onChange?: (v: string) => void) =>
  render(<Harness onChange={onChange} />, { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> });

describe('OtpInput', () => {
  it('shows each typed digit in its own box', () => {
    const { getByTestId, getByText } = setup();
    fireEvent.changeText(getByTestId('otp-input'), '123');
    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('keeps only six digits from a pasted or autofilled code', () => {
    const onChange = jest.fn();
    const { getByTestId } = setup(onChange);
    fireEvent.changeText(getByTestId('otp-input'), 'Код: 12 34 56 78');
    expect(onChange).toHaveBeenLastCalledWith('123456');
  });

  it('is one field for SMS autofill and screen readers', () => {
    const { getByTestId, getByLabelText } = setup();
    const input = getByTestId('otp-input');
    expect(input).toHaveProp('textContentType', 'oneTimeCode');
    expect(input).toHaveProp('autoComplete', 'sms-otp');
    expect(getByLabelText('Code from SMS')).toBe(input);
  });
});
