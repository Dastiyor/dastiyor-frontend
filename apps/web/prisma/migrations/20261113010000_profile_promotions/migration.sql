-- Paid-plan profile promotions and category pins. Additive only.
-- CreateTable
CREATE TABLE "ProfilePromotion" (
    "id" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ProfilePromotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfilePromotion_userId_createdAt_idx" ON "ProfilePromotion"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfilePromotion_category_endsAt_idx" ON "ProfilePromotion"("category", "endsAt");

-- CreateIndex
CREATE INDEX "ProfilePromotion_endsAt_idx" ON "ProfilePromotion"("endsAt");

-- AddForeignKey
ALTER TABLE "ProfilePromotion" ADD CONSTRAINT "ProfilePromotion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
