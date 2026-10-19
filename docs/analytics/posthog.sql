-- PostHog dashboards for Dastiyor: database setup and insight queries.
--
-- PostHog's data warehouse copies the views below from Supabase once a day
-- (Data pipeline → Sources → Postgres, schema `analytics`, SSL on, the Supabase
-- *pooler* host on port 5432 — PostHog connects over IPv4 only). Sync each view
-- incrementally on "updatedAt"; `subscriptions` has no updatedAt, so use a full
-- sync for it. Free tier: 1M synced rows a month.
--
-- The views expose no email, phone, password, token or message text. The
-- posthog_ro role can read only these views, never the base tables.

-- ─── 1. Run once in the Supabase SQL editor ─────────────────────────────────

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE OR REPLACE VIEW analytics.users AS
  SELECT id, role, city, "createdAt", "updatedAt" FROM public."User";

CREATE OR REPLACE VIEW analytics.tasks AS
  SELECT id, category, city, status, "createdAt", "updatedAt" FROM public."Task";

CREATE OR REPLACE VIEW analytics.responses AS
  SELECT id, "taskId", status, "createdAt", "updatedAt" FROM public."Response";

CREATE OR REPLACE VIEW analytics.payments AS
  SELECT id, amount, currency, status, plan, "createdAt", "updatedAt" FROM public."Payment";

CREATE OR REPLACE VIEW analytics.subscriptions AS
  SELECT id, plan, source, "isActive", "startDate", "endDate" FROM public."Subscription";

CREATE OR REPLACE VIEW analytics.sourcing_requests AS
  SELECT id, category, city, headcount, status, "createdAt", "updatedAt" FROM public."SourcingRequest";

-- Pick a long random password and keep it in the team password manager, not here.
-- CREATE ROLE posthog_ro LOGIN PASSWORD '<random>';
GRANT USAGE ON SCHEMA analytics TO posthog_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO posthog_ro;
-- Nothing is granted on schema public. Views run with their owner's rights, so
-- posthog_ro sees exactly the columns listed above.

-- If PostHog does not list views as sync sources, use base-table sync with a
-- column-limited copy instead; do not grant posthog_ro access to public.

-- ─── 2. Insights (PostHog → SQL insight). PostHog names the synced tables
--        postgres.<prefix>.<view> (prefix `dastiyor`) and snake_cases the columns.
--        A view with no rows gets no table until it has one.  ─────────

-- Activity dashboard

-- New users per day, by role (ADMIN is the dastiyor-admin panel login, not a user)
SELECT toDate(created_at) AS day, role, count() AS users
FROM postgres.dastiyor.users
WHERE role != 'ADMIN' AND created_at >= now() - INTERVAL 90 DAY
GROUP BY day, role ORDER BY day;

-- Tasks posted per week, by category
SELECT toStartOfWeek(created_at) AS week, category, count() AS tasks
FROM postgres.dastiyor.tasks
WHERE created_at >= now() - INTERVAL 180 DAY
GROUP BY week, category ORDER BY week;

-- Tasks posted by city (last 30 days)
SELECT city, count() AS tasks
FROM postgres.dastiyor.tasks
WHERE created_at >= now() - INTERVAL 30 DAY
GROUP BY city ORDER BY tasks DESC;

-- Average responses per task, by week the task was posted
SELECT toStartOfWeek(t.created_at) AS week, count(r.id) / count(DISTINCT t.id) AS responses_per_task
FROM postgres.dastiyor.tasks t LEFT JOIN postgres.dastiyor.responses r ON r.task_id = t.id
WHERE t.created_at >= now() - INTERVAL 180 DAY
GROUP BY week ORDER BY week;

-- Completed tasks per day (by when they were last updated to COMPLETED)
SELECT toDate(updated_at) AS day, count() AS completed
FROM postgres.dastiyor.tasks
WHERE status = 'COMPLETED' AND updated_at >= now() - INTERVAL 90 DAY
GROUP BY day ORDER BY day;

-- Revenue dashboard

-- Web (SmartPay) revenue per day, by plan, in somoni.
-- Store (App Store / Google Play) revenue is in RevenueCat, or in PostHog via
-- RevenueCat's own PostHog integration.
SELECT toDate(created_at) AS day, plan, sum(amount) AS somoni
FROM postgres.dastiyor.payments
WHERE status = 'COMPLETED' AND created_at >= now() - INTERVAL 180 DAY
GROUP BY day, plan ORDER BY day;

-- Active subscriptions by plan and where they were bought
SELECT plan, source, count() AS active
FROM postgres.dastiyor.subscriptions
WHERE is_active AND end_date > now()
GROUP BY plan, source ORDER BY active DESC;

-- Subscriptions expiring in the next 7 days
SELECT plan, count() AS expiring
FROM postgres.dastiyor.subscriptions
WHERE is_active AND end_date > now() AND end_date <= now() + INTERVAL 7 DAY
GROUP BY plan;

-- Sourcing requests by status
SELECT status, count() AS requests
FROM postgres.dastiyor.sourcing_requests
GROUP BY status;
