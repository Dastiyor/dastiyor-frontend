import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OtpInput from '../OtpInput';

function Harness({ onChange }: { onChange?: (v: string) => void }) {
    const [code, setCode] = useState('');
    return (
        <>
            <label htmlFor="reg-code">Код из SMS</label>
            <OtpInput id="reg-code" value={code} onChange={(v) => { setCode(v); onChange?.(v); }} />
        </>
    );
}

describe('OtpInput', () => {
    it('is one labelled field that browsers can autofill from an SMS', () => {
        render(<Harness />);
        const input = screen.getByLabelText('Код из SMS');
        expect(input).toHaveAttribute('id', 'reg-code');
        expect(input).toHaveAttribute('autocomplete', 'one-time-code');
        expect(input).toHaveAttribute('inputmode', 'numeric');
    });

    it('draws each digit in its own box', () => {
        const { container } = render(<Harness />);
        fireEvent.change(screen.getByLabelText('Код из SMS'), { target: { value: '4071' } });
        const boxes = Array.from(container.querySelectorAll('[aria-hidden="true"]')).map(b => b.textContent);
        expect(boxes).toEqual(['4', '0', '7', '1', '', '']);
    });

    it('keeps only six digits from a pasted code', () => {
        const onChange = jest.fn();
        render(<Harness onChange={onChange} />);
        fireEvent.change(screen.getByLabelText('Код из SMS'), { target: { value: 'Код: 12 34 56 78' } });
        expect(onChange).toHaveBeenLastCalledWith('123456');
    });
});
