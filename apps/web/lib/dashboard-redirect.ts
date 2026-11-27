import { AnalyticsEvent, track } from '@/lib/analytics';

/**
 * After a password or SMS-code sign-in: record it, then a full page load, so the
 * header and dashboards see the new cookie. Goes back to where the person was
 * heading (a `safeRedirect` value), else to their dashboard.
 */
export function finishLogin(method: 'password' | 'sms', role: string | undefined, redirect: string): void {
    track(AnalyticsEvent.LoginCompleted, { method, role }, { leavingPage: true });
    window.location.href = redirect
        || (role === 'PROVIDER' ? '/provider' : role === 'CUSTOMER' ? '/customer' : '/');
}
