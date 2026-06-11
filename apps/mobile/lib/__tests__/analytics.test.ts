import {
  track,
  screen,
  identify,
  reset,
  setTransport,
  initAnalytics,
  __resetForTests,
  AnalyticsEvent,
  type AnalyticsTransport,
} from '@/lib/analytics';

function makeMock(): AnalyticsTransport & {
  events: Array<{ event: string; props?: unknown }>;
  screens: string[];
  ids: string[];
  resets: number;
} {
  const events: Array<{ event: string; props?: unknown }> = [];
  const screens: string[] = [];
  const ids: string[] = [];
  let resets = 0;
  return {
    events,
    screens,
    ids,
    get resets() {
      return resets;
    },
    track: (event, props) => events.push({ event, props }),
    screen: (name) => screens.push(name),
    identify: (userId) => ids.push(userId),
    reset: () => {
      resets += 1;
    },
  };
}

describe('analytics', () => {
  beforeEach(() => __resetForTests());
  afterEach(() => __resetForTests());

  it('routes track/screen/identify/reset to the active transport', () => {
    const mock = makeMock();
    setTransport(mock);

    track(AnalyticsEvent.TaskCreateCompleted, { category: 'Ремонт' });
    screen('TaskFeed');
    identify('user-1', { role: 'PROVIDER' });
    reset();

    expect(mock.events).toEqual([
      { event: 'task_create_completed', props: { category: 'Ремонт' } },
    ]);
    expect(mock.screens).toEqual(['TaskFeed']);
    expect(mock.ids).toEqual(['user-1']);
    expect(mock.resets).toBe(1);
  });

  it('exposes stable canonical funnel event names', () => {
    expect(AnalyticsEvent.SignUpCompleted).toBe('sign_up_completed');
    expect(AnalyticsEvent.LoginCompleted).toBe('login_completed');
    expect(AnalyticsEvent.ResponseSubmitted).toBe('response_submitted');
  });

  it('never throws when the transport throws', () => {
    setTransport({
      track: () => {
        throw new Error('fail');
      },
      screen: () => {
        throw new Error('fail');
      },
      identify: () => {
        throw new Error('fail');
      },
      reset: () => {
        throw new Error('fail');
      },
    });
    expect(() => track('x')).not.toThrow();
    expect(() => screen('y')).not.toThrow();
    expect(() => identify('z')).not.toThrow();
    expect(() => reset()).not.toThrow();
  });

  it('init without a vendor key is a safe no-op (keeps console transport)', () => {
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    expect(() => initAnalytics()).not.toThrow();
    // idempotent
    expect(() => initAnalytics()).not.toThrow();
  });
});
