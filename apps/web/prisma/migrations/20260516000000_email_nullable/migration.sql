-- Make email nullable on User to support phone-only registration
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
