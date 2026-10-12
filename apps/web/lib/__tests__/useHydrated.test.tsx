import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { useAdoptTypedValue, useHydrated } from '../useHydrated';

function SubmitButton() {
    return <button disabled={!useHydrated()}>send</button>;
}

function Field({ initialDomValue }: { initialDomValue?: string }) {
    const [value, setValue] = useState('');
    const ref = useRef<HTMLInputElement>(null);
    useAdoptTypedValue(ref, typed => setValue(typed.toUpperCase()));
    return (
        <>
            <input
                // Stands in for text typed before React attached: present in the
                // DOM node at mount, absent from state.
                ref={node => {
                    if (node && initialDomValue !== undefined && !ref.current) node.value = initialDomValue;
                    ref.current = node;
                }}
                value={value}
                onChange={e => setValue(e.target.value)}
                aria-label="field"
            />
            <output>{value}</output>
        </>
    );
}

describe('useHydrated', () => {
    // The server half — the button ships disabled — needs a real server render;
    // e2e/smoke/before-hydration.spec.ts checks it with scripts switched off.
    it('is true once mounted in the browser', () => {
        render(<SubmitButton />);
        expect(screen.getByRole('button')).toBeEnabled();
    });
});

describe('useAdoptTypedValue', () => {
    it('hands text already in the input to state, through the caller\'s own normalisation', () => {
        render(<Field initialDomValue="typed early" />);
        expect(screen.getByRole('status')).toHaveTextContent('TYPED EARLY');
    });

    it('does nothing for an empty input', () => {
        render(<Field />);
        expect(screen.getByRole('status')).toBeEmptyDOMElement();
        expect(screen.getByLabelText('field')).toHaveValue('');
    });
});
