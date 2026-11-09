import { render, screen } from '@testing-library/react';
import TierBadge, { tierCardStyle } from '../TierBadge';

describe('TierBadge', () => {
    it('renders nothing for a free account', () => {
        const { container } = render(<TierBadge tier={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows PRO, PRO+ and TOP', () => {
        render(<><TierBadge tier="pro" size="sm" /><TierBadge tier="pro_plus" /><TierBadge tier="business" /></>);
        expect(screen.getByText('PRO')).toBeInTheDocument();
        expect(screen.getByText('PRO+')).toBeInTheDocument();
        expect(screen.getByText('TOP')).toBeInTheDocument();
    });

    it('highlights PRO+ and BUSINESS cards only', () => {
        expect(tierCardStyle(null)).toBeUndefined();
        expect(tierCardStyle('pro')).toBeUndefined();
        expect(tierCardStyle('pro_plus')).toHaveProperty('border');
        expect(tierCardStyle('business')).toHaveProperty('backgroundColor');
    });
});
