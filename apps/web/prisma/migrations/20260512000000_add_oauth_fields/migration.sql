-- AlterTable: make password nullable and add OAuth ID columns
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- AddColumn
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN "appleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");
