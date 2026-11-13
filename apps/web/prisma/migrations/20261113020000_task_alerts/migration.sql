-- New-task alerts for paid providers. Additive only.
--
-- User.taskAlertsEnabled: the provider's on/off switch, on by default.
-- TaskAlert: alerts queued for later delivery (the PRO plan hears 15 minutes
-- after a task is posted). PRO+ and BUSINESS are alerted at once and get no
-- row. Both foreign keys cascade, so deleting a task, or an account (which
-- deletes its tasks), takes the queued alerts with it.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "taskAlertsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "TaskAlert" (
    "id" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "claimId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TaskAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskAlert_status_dueAt_idx" ON "TaskAlert"("status", "dueAt");

-- CreateIndex
CREATE INDEX "TaskAlert_claimId_idx" ON "TaskAlert"("claimId");

-- CreateIndex
CREATE INDEX "TaskAlert_userId_idx" ON "TaskAlert"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskAlert_taskId_userId_key" ON "TaskAlert"("taskId", "userId");

-- AddForeignKey
ALTER TABLE "TaskAlert" ADD CONSTRAINT "TaskAlert_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAlert" ADD CONSTRAINT "TaskAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
