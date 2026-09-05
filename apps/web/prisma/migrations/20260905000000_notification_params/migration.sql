-- Ingredients for rebuilding a notification's text in the reader's current
-- language. Nullable: rows written before this keep their stored title/message.
ALTER TABLE "Notification" ADD COLUMN "params" TEXT;
