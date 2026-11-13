-- Alif Acquiring alongside SmartPay. Additive only.

-- Which provider took a payment. Existing rows are SmartPay's.
ALTER TABLE "Payment" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'smartpay';

-- Auto-renewal: a provider's saved card or wallet (Alif tokenization), and the Alif
-- subscription that charges it every month.
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'alif',
    "requestId" TEXT NOT NULL,
    "token" TEXT,
    "account" TEXT,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentMethod_requestId_key" ON "PaymentMethod"("requestId");
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Subscription" ADD COLUMN "autoRenew" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN "providerSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "paymentMethodId" TEXT;
