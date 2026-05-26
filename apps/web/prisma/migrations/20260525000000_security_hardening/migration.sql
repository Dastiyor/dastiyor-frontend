-- Security hardening migration
-- 1. Change User.balance from Float to Int (whole somoni, no floating-point precision risk)
ALTER TABLE "User" ALTER COLUMN "balance" TYPE INTEGER USING balance::INTEGER;

-- 2. Add tokenVersion to User for JWT invalidation on logout/password-change
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- 3. Indexes on PasswordReset for faster token lookups and cleanup queries
CREATE INDEX IF NOT EXISTS "PasswordReset_token_idx" ON "PasswordReset"("token");
CREATE INDEX IF NOT EXISTS "PasswordReset_userId_used_idx" ON "PasswordReset"("userId", "used");

-- 4. Indexes on Report foreign keys for moderation queries
CREATE INDEX IF NOT EXISTS "Report_targetUserId_idx" ON "Report"("targetUserId");
CREATE INDEX IF NOT EXISTS "Report_targetTaskId_idx" ON "Report"("targetTaskId");

-- Rollback notes:
-- ALTER TABLE "User" ALTER COLUMN "balance" TYPE FLOAT8 USING balance::FLOAT8;
-- ALTER TABLE "User" DROP COLUMN "tokenVersion";
-- DROP INDEX IF EXISTS "PasswordReset_token_idx";
-- DROP INDEX IF EXISTS "PasswordReset_userId_used_idx";
-- DROP INDEX IF EXISTS "Report_targetUserId_idx";
-- DROP INDEX IF EXISTS "Report_targetTaskId_idx";
