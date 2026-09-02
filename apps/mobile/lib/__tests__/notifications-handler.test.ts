import { setActiveConversation, navigateFromNotificationData } from '../notifications-handler';
import { router } from 'expo-router';

describe('notification routing', () => {
  afterEach(() => { setActiveConversation(null); jest.clearAllMocks(); });

  it('navigates to a task when the push carries one', () => {
    navigateFromNotificationData({ taskId: 'task-1' });
    expect(router.push).toHaveBeenCalledWith('/task/task-1');
  });

  it('navigates to a chat when the push carries a partner', () => {
    navigateFromNotificationData({ partnerId: 'user-2' });
    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({ params: { partnerId: 'user-2' } })
    );
  });

  it('does nothing without data', () => {
    navigateFromNotificationData(undefined);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('tracking the active conversation does not throw', () => {
    // The handler reads this to stay silent for the chat already on screen.
    expect(() => { setActiveConversation('user-2'); setActiveConversation(null); }).not.toThrow();
  });
});
