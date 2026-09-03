/**
 * Seed the Category table from the built-in list so the admin dashboard has
 * something to manage. Idempotent — matches on slug, so re-running it neither
 * duplicates rows nor overwrites names you have since edited in the dashboard.
 *
 * Run once per database (reads apps/web/.env, same as `prisma db seed`):
 *   cd apps/web && npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-categories.ts
 *
 * On a database with existing tasks, follow up with the admin repo's
 * scripts/backfill-categories.js to pick up any legacy category strings that
 * tasks use but this list does not contain.
 */
import { PrismaClient } from '@prisma/client';
import { CATEGORIES } from '../lib/config-fallback';

const prisma = new PrismaClient();

const slugify = (name: string) =>
    name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

async function main() {
    let created = 0;

    for (const [order, name] of CATEGORIES.entries()) {
        const slug = slugify(name);
        const existing = await prisma.category.findUnique({ where: { slug } });

        if (existing) {
            console.log(`  skip    ${slug.padEnd(24)} ${existing.name}`);
            continue;
        }

        await prisma.category.create({ data: { name, slug, order } });
        console.log(`  create  ${slug.padEnd(24)} ${name}`);
        created++;
    }

    const total = await prisma.category.count();
    console.log(`\n${created} created, ${total} categories total.`);
}

main()
    .catch(err => {
        console.error('Seed failed:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
