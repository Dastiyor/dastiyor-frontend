/**
 * Company contact details shape and defaults, shared by the client and
 * `lib/company.ts`.
 *
 * Lives apart from `getCompany()` because that imports Prisma, and the footer
 * is a client component — mirroring `config-fallback.ts` / `categories.ts`.
 */
export interface Company {
    name: string;
    email: string;
    phone: string;
    supportEmail: string;
    address: string;
}

export const COMPANY_DEFAULTS: Company = {
    name: 'Dastiyor',
    email: 'info@dastiyor.com',
    phone: '',
    supportEmail: 'support@dastiyor.com',
    address: '',
};
