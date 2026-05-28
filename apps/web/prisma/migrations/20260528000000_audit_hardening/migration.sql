-- AlterTable
ALTER TABLE "VerificationCode" ADD COLUMN "used" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Response_taskId_userId_key" ON "Response"("taskId", "userId");

-- CreateIndex
CREATE INDEX "Subscription_endDate_idx" ON "Subscription"("endDate");
