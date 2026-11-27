/**
 * Google and Apple sign-ins end in a server redirect, so no page code sees them
 * happen. The callback leaves this short-lived cookie (`<event>.<provider>`) and
 * components/Analytics.tsx sends the event and removes it.
 */
export const AUTH_EVENT_COOKIE = 'auth_event';
