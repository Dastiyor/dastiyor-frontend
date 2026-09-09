import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { signInWithGoogle, signOutFromGoogle } from '@/lib/google-signin';

const mockSignIn = GoogleSignin.signIn as jest.Mock;
const mockGetTokens = GoogleSignin.getTokens as jest.Mock;
const mockSignOut = GoogleSignin.signOut as jest.Mock;

describe('signInWithGoogle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue({ type: 'success', data: {} });
    mockGetTokens.mockResolvedValue({ accessToken: 'ya29.token', idToken: 'id' });
  });

  it('returns the access token the API route expects', async () => {
    await expect(signInWithGoogle()).resolves.toBe('ya29.token');
  });

  it('configures the SDK once across repeated sign-ins', async () => {
    // Fresh registry: the module memoizes configure() in a module-level flag,
    // which clearAllMocks cannot reset.
    jest.resetModules();
    const sdk = require('@react-native-google-signin/google-signin').GoogleSignin;
    const { signInWithGoogle: freshSignIn } = require('@/lib/google-signin');

    await freshSignIn();
    await freshSignIn();

    expect(sdk.configure).toHaveBeenCalledTimes(1);
  });

  it('returns null when the user dismisses the picker', async () => {
    mockSignIn.mockResolvedValue({ type: 'cancelled' });

    await expect(signInWithGoogle()).resolves.toBeNull();
    expect(mockGetTokens).not.toHaveBeenCalled();
  });

  it('treats a thrown cancellation as a dismissal, not an error', async () => {
    // iOS surfaces cancellation as a coded throw rather than a result type.
    mockSignIn.mockRejectedValue({ code: statusCodes.SIGN_IN_CANCELLED });

    await expect(signInWithGoogle()).resolves.toBeNull();
  });

  it('rethrows real failures so the screen can surface them', async () => {
    mockSignIn.mockRejectedValue({ code: 'DEVELOPER_ERROR' });

    await expect(signInWithGoogle()).rejects.toEqual({ code: 'DEVELOPER_ERROR' });
  });
});

describe('signOutFromGoogle', () => {
  beforeEach(() => jest.clearAllMocks());

  it('never rejects, so logout cannot be blocked by the Google SDK', async () => {
    mockSignOut.mockRejectedValue(new Error('no session'));

    await expect(signOutFromGoogle()).resolves.toBeUndefined();
  });
});
