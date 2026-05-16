-- Add account lockout fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "loginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

-- Add indexes on Message for conversation queries
CREATE INDEX IF NOT EXISTS "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_receiverId_isRead_createdAt_idx" ON "Message"("receiverId", "isRead", "createdAt");

-- Add index on Notification for unread queries
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");
