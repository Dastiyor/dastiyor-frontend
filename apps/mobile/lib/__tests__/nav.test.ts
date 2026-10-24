import { Keyboard } from 'react-native';
import { router } from 'expo-router';
import { goBack, replaceFromModal } from '@/lib/nav';

const mockRouter = router as jest.Mocked<typeof router>;

describe('goBack', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pops the stack when there is something to go back to', () => {
    (mockRouter.canGoBack as jest.Mock).mockReturnValue(true);

    goBack();

    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('falls back to the tabs when the screen is the stack root', () => {
    // Cold-start deep link from a push notification: back() would be a no-op.
    (mockRouter.canGoBack as jest.Mock).mockReturnValue(false);

    goBack();

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('drops the keyboard before the transition', () => {
    // iOS strands the screen underneath if a modal is torn down while the
    // keyboard still holds first responder -- its back button goes dead.
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    (mockRouter.canGoBack as jest.Mock).mockReturnValue(true);

    goBack();

    expect(dismiss).toHaveBeenCalled();
  });
});

describe('replaceFromModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('drops the keyboard, then replaces', () => {
    // Signing in with the password field focused left every native back button dead.
    const order: string[] = [];
    jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => { order.push('dismiss'); });
    (mockRouter.replace as jest.Mock).mockImplementation(() => { order.push('replace'); });

    replaceFromModal('/(tabs)');

    expect(order).toEqual(['dismiss', 'replace']);
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });
});
