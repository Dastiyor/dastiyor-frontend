-- Notification language. Notifications are triggered by another user's action,
-- so the recipient's preference has to be stored rather than read off the
-- request. Defaults to the existing behaviour.
ALTER TABLE "User" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'ru';
