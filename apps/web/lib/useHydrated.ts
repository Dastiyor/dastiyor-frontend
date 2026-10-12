'use client';

import { useEffect, useSyncExternalStore, type RefObject } from 'react';

const subscribe = () => () => {};

/**
 * False while rendering on the server and until React has attached in the
 * browser. On a slow phone that gap is several seconds, during which the page
 * is visible and tappable but nothing on it has a handler yet.
 *
 * Forms use it to keep the submit button disabled until then: a form submitted
 * natively has no `onSubmit`, so the browser sends it as a GET and the fields
 * — a password included — end up in the address bar and the server logs.
 */
export function useHydrated(): boolean {
    return useSyncExternalStore(subscribe, () => true, () => false);
}

/**
 * Hands a controlled input's pre-hydration contents to its state, once.
 *
 * Text typed (or autofilled) before React attaches stays in the field, but no
 * change event ever reached React, so the state behind it is still empty: the
 * field looks filled in and everything derived from the state says it is not.
 */
export function useAdoptTypedValue(
    ref: RefObject<HTMLInputElement | null>,
    adopt: (value: string) => void,
) {
    useEffect(() => {
        const typed = ref.current?.value;
        if (typed) adopt(typed);
        // On mount only — from then on the input is controlled and state leads.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
