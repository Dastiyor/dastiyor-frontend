import { render } from '@testing-library/react';
import posthog from 'posthog-js';

jest.mock('posthog-js', () => ({
    __esModule: true,
    default: {
        __loaded: false,
        init: jest.fn(function (this: { __loaded: boolean }) { this.__loaded = true; }),
        identify: jest.fn(),
        reset: jest.fn(),
        get_property: jest.fn(),
    },
}));

const ph = posthog as unknown as {
    __loaded: boolean;
    init: jest.Mock; identify: jest.Mock; reset: jest.Mock; get_property: jest.Mock;
};

import Analytics from '../Analytics';

function load(key?: string) {
    if (key) process.env.NEXT_PUBLIC_POSTHOG_KEY = key;
    else delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    return Analytics;
}

beforeEach(() => {
    jest.clearAllMocks();
    ph.__loaded = false;
});

test('does nothing without a key', () => {
    const Analytics = load();
    render(<Analytics userId="u1" role="CUSTOMER" />);
    expect(ph.init).not.toHaveBeenCalled();
    expect(ph.identify).not.toHaveBeenCalled();
});

test('starts PostHog through the same-origin proxy', () => {
    const Analytics = load('phc_test');
    render(<Analytics userId={null} role={null} />);
    expect(ph.init).toHaveBeenCalledWith('phc_test', expect.objectContaining({
        api_host: '/ingest',
        person_profiles: 'identified_only',
    }));
});

test('identifies a signed-in user by id and role, like the app does', () => {
    const Analytics = load('phc_test');
    render(<Analytics userId="u1" role="PROVIDER" />);
    expect(ph.identify).toHaveBeenCalledWith('u1', { role: 'PROVIDER' });
});

test('forgets the user after they sign out', () => {
    const Analytics = load('phc_test');
    ph.get_property.mockReturnValue('identified');
    render(<Analytics userId={null} role={null} />);
    expect(ph.reset).toHaveBeenCalled();
});

test('does not reset an anonymous visitor on every page', () => {
    const Analytics = load('phc_test');
    ph.get_property.mockReturnValue('anonymous');
    render(<Analytics userId={null} role={null} />);
    expect(ph.reset).not.toHaveBeenCalled();
});

test('starts only once', () => {
    const Analytics = load('phc_test');
    const { rerender } = render(<Analytics userId={null} role={null} />);
    rerender(<Analytics userId="u1" role="CUSTOMER" />);
    expect(ph.init).toHaveBeenCalledTimes(1);
});
