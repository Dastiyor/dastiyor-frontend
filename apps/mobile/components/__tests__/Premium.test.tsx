import React from 'react';
import { Text } from 'react-native';
import { ChipGroup } from '../ChipGroup';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { GradientButton, Input, FadeIn, PressScale } from '../Premium';

const wrap = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

describe('Premium', () => {
  it('GradientButton presses through, and not when disabled', () => {
    const onPress = jest.fn();
    const { getByText, rerender } = render(<GradientButton onPress={onPress}><Text>Go</Text></GradientButton>, { wrapper: wrap });
    fireEvent.press(getByText('Go'));
    expect(onPress).toHaveBeenCalledTimes(1);
    rerender(<GradientButton onPress={onPress} disabled><Text>Go</Text></GradientButton>);
    fireEvent.press(getByText('Go'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('GradientButton keeps margins outside the clipped box', () => {
    const { getByRole } = render(
      <GradientButton style={{ marginTop: 12, padding: 16, borderRadius: 14 }}><Text>Go</Text></GradientButton>,
      { wrapper: wrap },
    );
    const inner = getByRole('button');
    expect(inner).toHaveStyle({ padding: 16, borderRadius: 14, overflow: 'hidden' });
    expect(inner).not.toHaveStyle({ marginTop: 12 });
  });

  it('Input glows only when boxed and focused', () => {
    const { getByPlaceholderText } = render(
      <>
        <Input placeholder="boxed" style={{ borderWidth: 1.5, borderColor: '#ccc' }} />
        <Input placeholder="bare" style={{ fontSize: 16 }} />
      </>,
      { wrapper: wrap },
    );
    fireEvent(getByPlaceholderText('boxed'), 'focus');
    expect(getByPlaceholderText('boxed')).toHaveStyle({ borderColor: '#2563EB' });
    fireEvent(getByPlaceholderText('boxed'), 'blur');
    expect(getByPlaceholderText('boxed')).toHaveStyle({ borderColor: '#ccc' });
    fireEvent(getByPlaceholderText('bare'), 'focus');
    expect(getByPlaceholderText('bare')).not.toHaveStyle({ borderColor: '#2563EB' });
  });

  it('FadeIn and PressScale render their children', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <FadeIn index={3}><PressScale onPress={onPress}><Text>Card</Text></PressScale></FadeIn>,
      { wrapper: wrap },
    );
    fireEvent.press(getByText('Card'));
    expect(onPress).toHaveBeenCalled();
  });

  it('ChipGroup shows the selected chip raised in accent with white text', () => {
    const { getByText } = render(
      <ChipGroup options={['A', 'B']} value="A" onChange={() => {}} />,
      { wrapper: wrap },
    );
    expect(getByText('A')).toHaveStyle({ color: '#fff' });
    expect(getByText('B')).not.toHaveStyle({ color: '#fff' });
  });
});
