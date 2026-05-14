import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity, Text } from 'react-native';
import { ToastProvider, useToast } from '../ToastContext';

function ToastTrigger({ message, type }: { message: string; type?: 'success' | 'error' | 'info' }) {
  const { show } = useToast();
  return (
    <TouchableOpacity testID="trigger" onPress={() => show(message, type)}>
      <Text>Show</Text>
    </TouchableOpacity>
  );
}

describe('ToastContext', () => {
  it('renders children without crashing', () => {
    const { getByText } = render(
      <ToastProvider>
        <Text>Hello</Text>
      </ToastProvider>
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('shows a success toast message when show() is called', async () => {
    const { getByTestId, getByText } = render(
      <ToastProvider>
        <ToastTrigger message="Task created!" type="success" />
      </ToastProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('trigger'));
    });

    await waitFor(() => expect(getByText('Task created!')).toBeTruthy());
  });

  it('shows error toast', async () => {
    const { getByTestId, getByText } = render(
      <ToastProvider>
        <ToastTrigger message="Something went wrong" type="error" />
      </ToastProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('trigger'));
    });

    await waitFor(() => expect(getByText('Something went wrong')).toBeTruthy());
  });

  it('defaults to info type when type not specified', async () => {
    const { getByTestId, getByText } = render(
      <ToastProvider>
        <ToastTrigger message="Info message" />
      </ToastProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('trigger'));
    });

    await waitFor(() => expect(getByText('Info message')).toBeTruthy());
  });

  it('throws when useToast used outside ToastProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ToastTrigger message="test" />)).toThrow(
      'useToast must be used within ToastProvider'
    );
    spy.mockRestore();
  });
});
