import {
  captureException,
  captureMessage,
  setUser,
  setReporter,
  initErrorReporting,
  __resetForTests,
  type Reporter,
} from '@/lib/errorReporting';

function makeMockReporter(): Reporter & {
  exceptions: unknown[];
  messages: string[];
  users: unknown[];
} {
  const exceptions: unknown[] = [];
  const messages: string[] = [];
  const users: unknown[] = [];
  return {
    exceptions,
    messages,
    users,
    captureException: (e) => exceptions.push(e),
    captureMessage: (m) => messages.push(m),
    setUser: (u) => users.push(u),
  };
}

describe('errorReporting', () => {
  beforeEach(() => __resetForTests());
  afterEach(() => __resetForTests());

  it('routes captureException to the active reporter', () => {
    const mock = makeMockReporter();
    setReporter(mock);
    const err = new Error('boom');
    captureException(err, { foo: 'bar' });
    expect(mock.exceptions).toContain(err);
  });

  it('routes captureMessage and setUser', () => {
    const mock = makeMockReporter();
    setReporter(mock);
    captureMessage('hello', 'warning');
    setUser({ id: 'u1', role: 'CUSTOMER' });
    expect(mock.messages).toContain('hello');
    expect(mock.users).toEqual([{ id: 'u1', role: 'CUSTOMER' }]);
  });

  it('never throws even if the reporter throws', () => {
    setReporter({
      captureException: () => {
        throw new Error('reporter failed');
      },
      captureMessage: () => {
        throw new Error('reporter failed');
      },
      setUser: () => {
        throw new Error('reporter failed');
      },
    });
    expect(() => captureException(new Error('x'))).not.toThrow();
    expect(() => captureMessage('y')).not.toThrow();
    expect(() => setUser(null)).not.toThrow();
  });

  it('init is idempotent and installs a global JS error handler', () => {
    const handlers: Array<(e: unknown, fatal?: boolean) => void> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).ErrorUtils = {
      getGlobalHandler: () => undefined,
      setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => handlers.push(h),
    };

    initErrorReporting();
    initErrorReporting(); // second call is a no-op
    expect(handlers).toHaveLength(1);

    // The installed handler should forward to the reporter without throwing.
    const mock = makeMockReporter();
    setReporter(mock);
    handlers[0](new Error('global-crash'), true);
    expect(mock.exceptions).toHaveLength(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).ErrorUtils;
  });

  it('without a DSN, init keeps the console reporter (no native SDK required)', () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    expect(() => initErrorReporting()).not.toThrow();
  });
});
