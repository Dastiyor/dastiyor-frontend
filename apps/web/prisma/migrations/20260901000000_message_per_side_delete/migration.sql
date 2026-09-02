-- Per-side conversation delete. Additive and backward compatible: existing
-- rows default to visible for both participants.
ALTER TABLE "Message" ADD COLUMN "deletedBySender" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "deletedByReceiver" BOOLEAN NOT NULL DEFAULT false;

-- Thread and conversation-list queries filter on these alongside the
-- existing participant indexes.
CREATE INDEX "Message_senderId_deletedBySender_idx" ON "Message"("senderId", "deletedBySender");
CREATE INDEX "Message_receiverId_deletedByReceiver_idx" ON "Message"("receiverId", "deletedByReceiver");
