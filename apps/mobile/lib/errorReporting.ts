/**
 * Vendor-agnostic crash / error reporting.
 *
 * Production sink (Sentry / Crashlytics) plugs in as an adapter. The real
 * SDK is loaded lazily via dynamic import ONLY when a DSN is configured, so
 * this module stays import-safe under Jest / Metro / web with no native dep.
 *
 * To enable Sentry in a build:
 *   1. add @sentry/react-native to package.json
 *   2. set EXPO_PUBLIC_SENTRY_DSN
 * No app code changes required.
 */

export type Severity = 'fatal' | 'error' | 'warning' | 'info';

export interface Reporter {
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, level?: Severity): void;
  setUser(user: { id: string; role?: string } | null): void;
}

// ── Default reporter: structured console output (dev / no DSN) ────────────────
const consoleReporter: Reporter = {
  captureException(error, context) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[errorReporting] exception:', err.message, context ?? '');
    }
  },
  captureMessage(message, level = 'info') {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[errorReporting] ${level}:`, message);
    }
  },
  setUser() {
    /* no-op for console reporter */
  },
};

let reporter: Reporter = consoleReporter;
let initialized = false;

/** Swap the active reporter. Used by init (Sentry adapter) and by tests. */
export function setReporter(next: Reporter) {
  reporter = next;
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  try {
    reporter.captureException(error, context);
  } catch {
    /* never let the reporter itself throw */
  }
}

export function captureMessage(message: string, level: Severity = 'info') {
  try {
    reporter.captureMessage(message, level);
  } catch {
    /* swallow */
  }
}

export function setUser(user: { id: string; role?: string } | null) {
  try {
    reporter.setUser(user);
  } catch {
    /* swallow */
  }
}

/**
 * Install global handlers and (optionally) the Sentry adapter.
 * Idempotent. Safe to call before the native SDK exists — the dynamic import
 * is fully guarded.
 */
export function initErrorReporting() {
  if (initialized) return;
  initialized = true;

  installGlobalHandlers();

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return; // dev / not configured → console reporter stays

  // Lazy-load the native SDK so the module graph never statically depends on it.
  loadSentry(dsn).catch((err) => {
    consoleReporter.captureException(err, { phase: 'sentry-init' });
  });
}

async function loadSentry(dsn: string) {
  // Indirection keeps Metro/Jest from trying to statically resolve the module.
  const moduleName = '@sentry/react-native';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Sentry: any = await import(/* webpackIgnore: true */ moduleName).catch(() => null);
  if (!Sentry?.init) return;

  Sentry.init({ dsn, tracesSampleRate: 0.2 });
  setReporter({
    captureException: (error, context) =>
      Sentry.captureException(error, context ? { extra: context } : undefined),
    captureMessage: (message, level) => Sentry.captureMessage(message, level),
    setUser: (user) => Sentry.setUser(user ? { id: user.id, role: user.role } : null),
  });
}

function installGlobalHandlers() {
  // Global uncaught JS errors (React Native ErrorUtils).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  if (g.ErrorUtils?.setGlobalHandler && g.ErrorUtils?.getGlobalHandler) {
    const prev = g.ErrorUtils.getGlobalHandler();
    g.ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      captureException(error, { isFatal: !!isFatal, source: 'globalHandler' });
      if (typeof prev === 'function') prev(error, isFatal);
    });
  }

  // Unhandled promise rejections.
  if (typeof g.addEventListener === 'function') {
    g.addEventListener('unhandledrejection', (event: { reason?: unknown }) => {
      captureException(event?.reason ?? new Error('unhandledrejection'), {
        source: 'unhandledrejection',
      });
    });
  }
}

/** Test-only: reset module state between cases. */
export function __resetForTests() {
  reporter = consoleReporter;
  initialized = false;
}
