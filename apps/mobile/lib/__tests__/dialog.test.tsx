import { Keyboard } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert, DialogHost } from '@/lib/dialog';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { getTranslations } from '@/lib/i18n';

const common = getTranslations('ru').common;

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

  it('puts a success badge on a "done" dialog and centres its text', async () => {
    host();
    act(() => { Alert.alert(common.done, 'Задание опубликовано'); });
    expect(await screen.findByText(common.done)).toHaveStyle({ textAlign: 'center' });
    expect(screen.getByText('Задание опубликовано')).toHaveStyle({ textAlign: 'center' });
  });

  it('takes an explicit success icon for a dialog titled otherwise', async () => {
    host();
    act(() => { Alert.alert('Код отправлен', 'Проверьте SMS', undefined, { icon: 'success' }); });
    expect(await screen.findByText('Код отправлен')).toHaveStyle({ textAlign: 'center' });
  });

  it('says what went wrong and offers to try again, not a bare "Error" and "OK"', async () => {
    host();
    act(() => { Alert.alert(common.error, 'Неверный или просроченный код'); });
    expect(await screen.findByText(common.errorTitle)).toHaveStyle({ textAlign: 'center' });
    expect(screen.queryByText(common.error)).toBeNull();
    expect(screen.getByText(common.errorRetry)).toBeTruthy();
    expect(screen.queryByText(common.ok)).toBeNull();
  });

  it('gives a success dialog a "Continue" button', async () => {
    host();
    act(() => { Alert.alert(common.done, 'Пароль изменён'); });
    expect(await screen.findByText(common.continue)).toBeTruthy();
  });

  it('shows a badge dialog\'s cancel as a text link under the main action', async () => {
    const onCreate = jest.fn();
    host();
    act(() => {
      Alert.alert('Этот номер не зарегистрирован', 'Создайте аккаунт', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Создать аккаунт', onPress: onCreate },
      ], { icon: 'error' });
    });
    fireEvent.press(await screen.findByText('Создать аккаунт'));
    flushFrame();
    expect(onCreate).toHaveBeenCalled();
  });

  it('keeps a plain dialog plain', async () => {
    host();
    act(() => { Alert.alert('Удалить задание?', 'Это нельзя отменить'); });
    expect(await screen.findByText('Удалить задание?')).not.toHaveStyle({ textAlign: 'center' });
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
