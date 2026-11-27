import { replaceFromModal } from '@/lib/nav';
import { cancelReturnToTask, leaveAuth, noteSignedInRole, returnToTaskAfterSignIn } from '@/lib/auth-return';

jest.mock('@/lib/nav', () => ({ replaceFromModal: jest.fn() }));

describe('leaveAuth', () => {
  beforeEach(() => { jest.clearAllMocks(); cancelReturnToTask(); noteSignedInRole('CUSTOMER'); });

  it('goes to the tabs by default', () => {
    leaveAuth();
    expect(replaceFromModal).toHaveBeenCalledWith('/(tabs)');
  });

  it('returns a customer to the task form, once', () => {
    returnToTaskAfterSignIn();
    leaveAuth();
    leaveAuth();
    expect((replaceFromModal as jest.Mock).mock.calls).toEqual([['/create-task'], ['/(tabs)']]);
  });

  it('does not open the form for a specialist, who cannot post', () => {
    noteSignedInRole('PROVIDER');
    returnToTaskAfterSignIn();
    leaveAuth();
    expect(replaceFromModal).toHaveBeenCalledWith('/(tabs)');
  });

  it('forgets the form when sign-in is closed', () => {
    returnToTaskAfterSignIn();
    cancelReturnToTask();
    leaveAuth();
    expect(replaceFromModal).toHaveBeenCalledWith('/(tabs)');
  });
});
