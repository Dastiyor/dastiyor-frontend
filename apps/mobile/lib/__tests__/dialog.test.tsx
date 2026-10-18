import { Keyboard } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert, DialogHost } from '@/lib/dialog';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

function host() {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <DialogHost />
      </LanguageProvider>
    </ThemeProvider>,
  );
}

/** The host defers handlers by a frame so navigation can't race the dismissal. */
function flushFrame() {
  act(() => { jest.advanceTimersByTime(20); });
}

describe('themed Alert', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('drops the keyboard as soon as a dialog opens', () => {
    // A modal closed from the dialog's button while a field is still first responder
    // leaves the screen underneath with a dead header back button (iOS).
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    host();
    act(() => { Alert.alert('T'); });
    expect(dismiss).toHaveBeenCalled();
    dismiss.mockRestore();
  });

  it('renders the title, message and buttons in-app', async () => {
    host();
    act(() => { Alert.alert('Заголовок', 'Сообщение', [{ text: 'Отмена', style: 'cancel' }, { text: 'Да' }]); });

    expect(await screen.findByText('Заголовок')).toBeTruthy();
    expect(screen.getByText('Сообщение')).toBeTruthy();
    expect(screen.getByText('Да')).toBeTruthy();
  });

  it('runs the pressed button handler after the dialog is gone', async () => {
    const onPress = jest.fn();
    host();
    act(() => { Alert.alert('T', undefined, [{ text: 'Go', onPress }]); });

    fireEvent.press(await screen.findByText('Go'));
    expect(onPress).not.toHaveBeenCalled(); // still the same frame
    flushFrame();
    expect(onPress).toHaveBeenCalled();
    expect(screen.queryByText('T')).toBeNull();
  });

  it('shows a queued dialog once the first is dismissed', async () => {
    host();
    act(() => {
      Alert.alert('First', undefined, [{ text: 'ok' }]);
      Alert.alert('Second', undefined, [{ text: 'ok' }]);
    });

    fireEvent.press(await screen.findByText('ok'));
    flushFrame();
    expect(screen.getByText('Second')).toBeTruthy();
  });
});
