import { router } from 'expo-router';
import { goBack } from '@/lib/nav';

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
});
