-- AddColumn: OAuth registrants must verify a phone before they can post or accept tasks
ALTER TABLE "User" ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
