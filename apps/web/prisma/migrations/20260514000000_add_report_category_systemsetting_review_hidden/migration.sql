-- Add hidden field to Review
ALTER TABLE "Review" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Report
CREATE TABLE "Report" (
    "id"           TEXT NOT NULL,
    "reason"       TEXT NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reporterId"   TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetTaskId" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Category
CREATE TABLE "Category" (
    "id"            TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "slug"          TEXT NOT NULL,
    "order"         INTEGER NOT NULL DEFAULT 0,
    "subcategories" TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SystemSetting
CREATE TABLE "SystemSetting" (
    "key"       TEXT NOT NULL,
    "value"     TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Report_status_idx" ON "Report"("status");
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Report" ADD CONSTRAINT "Report_targetUserId_fkey"
    FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Report" ADD CONSTRAINT "Report_targetTaskId_fkey"
    FOREIGN KEY ("targetTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
