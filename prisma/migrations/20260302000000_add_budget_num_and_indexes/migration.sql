-- Add numeric budget/price columns for correct filtering and sorting in DB
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "budgetAmountNum" INTEGER;
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "priceNum" INTEGER;

-- Backfill Task.budgetAmountNum from budgetAmount where numeric
UPDATE "Task"
SET "budgetAmountNum" = CASE
  WHEN "budgetAmount" ~ '^[0-9]+$' THEN ("budgetAmount")::INTEGER
  ELSE NULL
END
WHERE "budgetAmountNum" IS NULL;

-- Backfill Response.priceNum from price where numeric (optional, run if you have data)
UPDATE "Response"
SET "priceNum" = CASE
  WHEN "price" ~ '^[0-9]+$' THEN ("price")::INTEGER
  ELSE NULL
END
WHERE "priceNum" IS NULL;

-- Indexes for common filters and list performance
CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");
CREATE INDEX IF NOT EXISTS "Task_category_idx" ON "Task"("category");
CREATE INDEX IF NOT EXISTS "Task_city_idx" ON "Task"("city");
CREATE INDEX IF NOT EXISTS "Task_userId_idx" ON "Task"("userId");
CREATE INDEX IF NOT EXISTS "Task_createdAt_idx" ON "Task"("createdAt");
CREATE INDEX IF NOT EXISTS "Task_status_category_city_idx" ON "Task"("status", "category", "city");
CREATE INDEX IF NOT EXISTS "Response_taskId_idx" ON "Response"("taskId");
CREATE INDEX IF NOT EXISTS "Response_userId_idx" ON "Response"("userId");
