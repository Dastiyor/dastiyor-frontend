import { render, screen } from '@testing-library/react';
import PhoneField from '../PhoneField';

jest.mock('@/lib/i18n', () => {
    const i18n = { t: (key: string) => key, tError: (m: string) => m, locale: 'ru' };
    return { useTranslation: () => i18n };
});

describe('PhoneField', () => {
    it('shows the number read-only and links to SMS verification, returning to the form', () => {
        render(<PhoneField phone="+992901234567" returnTo="/customer/profile/edit" />);

        const input = screen.getByLabelText('profile.phoneLabel') as HTMLInputElement;
        expect(input.value).toBe('+992901234567');
        expect(input.readOnly).toBe(true);
        expect(screen.getByRole('link', { name: 'profile.phoneChange' }))
            .toHaveAttribute('href', '/verify-phone?redirect=%2Fcustomer%2Fprofile%2Fedit');
    });

    it('offers to add a number when there is none', () => {
        render(<PhoneField phone="" returnTo="/profile/edit" />);

        expect(screen.getByRole('link', { name: 'profile.phoneAdd' })).toBeInTheDocument();
    });
});
