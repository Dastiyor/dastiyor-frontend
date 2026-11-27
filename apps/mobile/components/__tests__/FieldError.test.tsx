import React from 'react';
import { render } from '@testing-library/react-native';
import { FieldError } from '../FieldError';

describe('FieldError', () => {
  it('shows the message in red, announced to screen readers', () => {
    const { getByText } = render(<FieldError message="Fill in this field" />);
    const text = getByText('Fill in this field');
    expect(text).toHaveStyle({ color: '#DC2626' });
    expect(text).toHaveProp('accessibilityRole', 'alert');
  });

  it('renders nothing without a message', () => {
    expect(render(<FieldError message={undefined} />).toJSON()).toBeNull();
  });
});
