/**
 * Vendor-agnostic product analytics.
 *
 * Events route to a pluggable transport. The default is a buffered console
 * transport (dev / no key). A vendor SDK (PostHog, Amplitude, Firebase, …)
 * plugs in as an adapter via env-gated dynamic import — no app code change,
 * no native dependency required for the app to build or for tests to run.
 *
 * Canonical funnel events live in AnalyticsEvent so names stay consistent.
 */

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export const AnalyticsEvent = {
  AppOpen: 'app_open',
  SignUpCompleted: 'sign_up_completed',
  LoginCompleted: 'login_completed',
  Logout: 'logout',
  TaskViewed: 'task_viewed',
  TaskCreateStarted: 'task_create_started',
  TaskCreateCompleted: 'task_create_completed',
  ResponseSubmitted: 'response_submitted',
  MessageSent: 'message_sent',
  OfferAccepted: 'offer_accepted',
} as const;

export interface AnalyticsTransport {
  track(event: string, props?: AnalyticsProps): void;
  screen(name: string, props?: AnalyticsProps): void;
  identify(userId: string, traits?: AnalyticsProps): void;
  reset(): void;
}

// ── Default transport: structured console (dev / no vendor key) ───────────────
const consoleTransport: AnalyticsTransport = {
  track(event, props) {
    // eslint-disable-next-line no-console
    if (__DEV__) console.log('[analytics] track', event, props ?? {});
  },
  screen(name, props) {
    // eslint-disable-next-line no-console
    if (__DEV__) console.log('[analytics] screen', name, props ?? {});
  },
  identify(userId) {
    // eslint-disable-next-line no-console
    if (__DEV__) console.log('[analytics] identify', userId);
  },
  reset() {
    /* no-op */
  },
};

let transport: AnalyticsTransport = consoleTransport;
let initialized = false;

/** Swap the active transport. Used by init (vendor adapter) and by tests. */
export function setTransport(next: AnalyticsTransport) {
  transport = next;
}

export function track(event: string, props?: AnalyticsProps) {
  try {
    transport.track(event, props);
  } catch {
    /* analytics must never break the app */
  }
}

export function screen(name: string, props?: AnalyticsProps) {
  try {
    transport.screen(name, props);
  } catch {
    /* swallow */
  }
}

export function identify(userId: string, traits?: AnalyticsProps) {
  try {
    transport.identify(userId, traits);
  } catch {
    /* swallow */
  }
}

export function reset() {
  try {
    transport.reset();
  } catch {
    /* swallow */
  }
}

/**
 * Initialize analytics. Idempotent. Loads the PostHog adapter only when
 * EXPO_PUBLIC_POSTHOG_KEY is set; otherwise the console transport stays.
 */
export function initAnalytics() {
  if (initialized) return;
  initialized = true;

  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  try {
    loadPostHog(key);
  } catch {
    /* keep console transport on adapter failure */
  }
}

function loadPostHog(apiKey: string) {
  // Literal require so Metro bundles it and Hermes can compile the release build
  // (a variable `import()` fails Hermes with "Invalid expression encountered").
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mod: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('posthog-react-native');
  } catch {
    return;
  }
  const PostHog = mod?.default ?? mod?.PostHog;
  if (!PostHog) return;

  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  const client = new PostHog(apiKey, { host });
  setTransport({
    track: (event, props) => client.capture(event, props),
    screen: (name, props) => client.screen(name, props),
    identify: (userId, traits) => client.identify(userId, traits),
    reset: () => client.reset(),
  });
}

/** Test-only: reset module state between cases. */
export function __resetForTests() {
  transport = consoleTransport;
  initialized = false;
}
