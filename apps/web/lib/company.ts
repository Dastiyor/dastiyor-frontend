import { prisma } from '@/lib/prisma';
import { COMPANY_DEFAULTS, type Company } from '@/lib/company-defaults';

/**
 * Company contact details, edited in the separate dastiyor-admin repo
 * (Settings → Company), which upserts them as a JSON blob into
 * `SystemSetting` under the key `company`.
 *
 * Server-only — imports Prisma. Read it in a server component and pass the
 * result down as props; the footer renders on every public page and should not
 * cost a request each time. Client components import the shape and defaults
 * from `@/lib/company-defaults` instead.
 *
 * The logo and favicon inputs on that admin page are not wired to anything and
 * save nothing, so there is deliberately no image field here.
 */
const KEYS = Object.keys(COMPANY_DEFAULTS) as (keyof Company)[];

export async function getCompany(): Promise<Company> {
    try {
        const row = await prisma.systemSetting.findUnique({ where: { key: 'company' } });
        if (!row?.value) return COMPANY_DEFAULTS;

        const saved = JSON.parse(row.value) as Partial<Company>;
        const merged = { ...COMPANY_DEFAULTS };

        // Per key, not a spread: the panel writes '' for a cleared field, and a
        // spread of undefined-valued keys would drop it back to the default.
        for (const key of KEYS) {
            if (typeof saved[key] === 'string') merged[key] = saved[key];
        }
        return merged;
    } catch (err) {
        console.error('[company] lookup failed, using defaults:', err);
        return COMPANY_DEFAULTS;
    }
}
