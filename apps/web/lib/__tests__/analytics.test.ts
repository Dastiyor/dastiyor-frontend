import posthog from 'posthog-js';
import { track } from '../analytics';
import { finishLogin } from '../dashboard-redirect';

jest.mock('posthog-js', () => ({
    __esModule: true,
    default: { __loaded: false, init: jest.fn(), register: jest.fn(), capture: jest.fn() },
}));
const ph = posthog as unknown as { init: jest.Mock; capture: jest.Mock };

afterEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
});

it('sends nothing without a key', () => {
    track('login_completed');
    expect(ph.capture).not.toHaveBeenCalled();
});

it('starts PostHog itself, for a page whose effect runs first', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';
    track('task_create_started');
    expect(ph.init).toHaveBeenCalled();
    expect(ph.capture).toHaveBeenCalledWith('task_create_started', undefined, undefined);
});

it('sends a sign-in at once, before the page is left', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';
    finishLogin('sms', 'CUSTOMER', '/create-task');
    expect(ph.capture).toHaveBeenCalledWith(
        'login_completed',
        { method: 'sms', role: 'CUSTOMER' },
        { send_instantly: true, transport: 'sendBeacon' },
    );
});

it('never breaks the page', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';
    ph.capture.mockImplementationOnce(() => { throw new Error('blocked'); });
    expect(() => track('login_completed')).not.toThrow();
});
