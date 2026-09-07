-- Editorially promoted tasks. `featured` is toggled from dastiyor-admin;
-- `featuredAt` records when it was last switched on so the feed can order the
-- promoted strip newest-first.
ALTER TABLE "Task" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN "featuredAt" TIMESTAMP(3);

CREATE INDEX "Task_status_featured_featuredAt_idx" ON "Task"("status", "featured", "featuredAt");

-- Hard cap of 3 featured tasks, enforced at the database so it holds no matter
-- which app writes the column. The admin UI should check the count first and
-- show a friendly message; this trigger is the backstop against races.
CREATE OR REPLACE FUNCTION enforce_featured_task_cap() RETURNS trigger AS $$
BEGIN
  IF NEW.featured AND (TG_OP = 'INSERT' OR NOT OLD.featured) THEN
    IF (SELECT count(*) FROM "Task" WHERE featured) >= 3 THEN
      RAISE EXCEPTION 'Featured task limit reached (max 3)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_featured_cap
  BEFORE INSERT OR UPDATE OF featured ON "Task"
  FOR EACH ROW EXECUTE FUNCTION enforce_featured_task_cap();
