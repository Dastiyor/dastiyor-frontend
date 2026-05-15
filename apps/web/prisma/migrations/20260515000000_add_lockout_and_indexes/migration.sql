-- Add account lockout fields to User
ALTER TABLE "User" ADD COLUMN "loginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- Add indexes on Message for conversation queries
CREATE INDEX "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");
CREATE INDEX "Message_receiverId_isRead_createdAt_idx" ON "Message"("receiverId", "isRead", "createdAt");

-- Add index on Notification for unread queries
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");
