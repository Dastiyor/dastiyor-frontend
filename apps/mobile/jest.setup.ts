import '@testing-library/jest-native/extend-expect';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  },
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn((cb: () => void) => cb()),
  Link: 'Link',
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock api-client callbacks (prevent module-level side effects)
jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    del: jest.fn(),
  },
  setOnUnauthorized: jest.fn(),
  setOnNetworkError: jest.fn(),
}));

// Suppress expected console errors in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0]);
    if (
      msg.includes('Warning:') ||
      msg.includes('ReactDOM.render') ||
      msg.includes('act(')
    ) return;
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});
