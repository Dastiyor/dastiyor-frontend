import { render, screen } from '@testing-library/react';
import TierBadge from '../TierBadge';

describe('TierBadge', () => {
    it('renders nothing for a free account', () => {
        const { container } = render(<TierBadge tier={null} label="Premium" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the label for a paid tier', () => {
        render(<TierBadge tier="standard" label="Стандарт" size="sm" />);
        expect(screen.getByText('Стандарт')).toBeInTheDocument();
    });
});
