-- Where a subscription was bought. Additive only.
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'web';

