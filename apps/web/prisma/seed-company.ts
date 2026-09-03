/**
 * Seed the company contact details the footer renders, so a fresh database
 * shows something before anyone opens the admin panel.
 *
 * Stored the way dastiyor-admin writes them: a JSON blob in SystemSetting
 * under the key `company` (see its app/api/settings/[key]/route.js).
 *
 * Non-destructive — if the row already exists it is left alone, so this never
 * overwrites what you have saved in the panel. Edit the values below to change
 * what a fresh database starts with; edit the panel to change production.
 *
 * Run once per database (reads apps/web/.env, same as `prisma db seed`):
 *   cd apps/web && npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-company.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPANY = {
    name: 'Dastiyor',
    email: 'info@dastiyor.com',
    phone: '',
    supportEmail: 'support@dastiyor.com',
    address: '',
};

async function main() {
    const existing = await prisma.systemSetting.findUnique({ where: { key: 'company' } });

    if (existing) {
        console.log('company settings already present, leaving them alone:');
        console.log(' ', existing.value);
        return;
    }

    await prisma.systemSetting.create({
        data: { key: 'company', value: JSON.stringify(COMPANY) },
    });
    console.log('seeded company settings:', COMPANY);
}

main()
    .catch(err => {
        console.error('Seed failed:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
