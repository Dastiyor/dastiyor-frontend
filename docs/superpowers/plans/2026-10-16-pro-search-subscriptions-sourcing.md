# Professional Search, Subscriptions and Sourcing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Richer provider profiles with a portfolio, a real searchable/sortable professionals directory on web and mobile, subscription tiers that rank in search and can be bought on the web (SmartPay) and in the apps (App Store / Google Play), a paid sourcing request flow for companies, and PostHog dashboards.

**Architecture:** Everything server-side lives in `apps/web` (the only backend); mobile consumes the same routes. One raw-SQL search function (`lib/professionals.ts`) owns filtering, rating aggregation, tier ranking and pagination so sorting happens in Postgres, not per page. The sourcing queue is managed from the separate `dastiyor-admin` repo, which shares the database and keeps its own copy of `schema.prisma`.

**Tech Stack:** Next.js 16 App Router, Prisma + Supabase Postgres, Expo Router, Vercel Blob (existing `/api/upload`), SmartPay merchant API (web payments), RevenueCat + App Store / Google Play billing (app payments), Brevo (`lib/notifications/email.ts`), PostHog (data warehouse + dashboards).

**Spec:** https://claude.ai/artifact/2AJwi8mBwHKbTgu6GGtH31 — "Dastiyor Phase Estimate", 12 Oct 2026, 27 tasks / 22 h / $660 / 7 days. Task ids below (`pd-schema`, `se-api`…) are the estimate's ids so progress can be ticked off there.

## Global Constraints

- Every DB write is a production write (one shared Supabase DB). Migrations are additive only: new nullable columns / new tables, no drops or renames.
- Changing an API route changes both clients. New response shapes go in `packages/types/index.ts`.
- New routes use `requireAuth(request)` from `lib/require-auth.ts`, never bare `verifyJWT`.
- Categories and cities are stored, filtered and sent as canonical Russian strings; validate against `getCategories()` and `CITIES` (`lib/config-fallback.ts`) — the same lists the task form uses. Translate for display only via `lib/i18n/terms.ts` (web) / `apps/mobile/lib/terms.ts` (mobile).
- Every new `error:` string is a Russian literal and gets a Tajik entry in `apps/web/lib/i18n/api-errors.ts` and en+tj in `apps/mobile/lib/serverErrors.ts`.
- All new UI labels in `ru.json` + `tj.json` (web) and `apps/mobile/lib/i18n.ts` (ru, tj, en).
- Tier badges and tier ranking only apply while `SUBSCRIPTIONS_ENABLED` (`lib/features.ts`) is true. Do not delete or bypass the flag.
- Jest 90% global coverage threshold; `pnpm --filter @dastiyor/web exec tsc --noEmit` and the mobile equivalent must pass before each commit.
- Commit straight to `main`, one commit per task.
- Styling: CSS Modules + inline styles, `lucide-react` icons on web, no Tailwind.

## Decisions and Open Questions

1. **Decided (2026-10-16): the apps sell subscriptions through Apple / Google in-app purchase; the web keeps SmartPay.** The estimate's "SmartPay checkout from the app" (`mp-pay`) is replaced by store billing, via RevenueCat (`react-native-purchases`). RevenueCat validates receipts and renewals for both stores and notifies our server by webhook; writing App Store Server API + Play Developer API validation ourselves is ~2 extra days. `ponytail:` RevenueCat is free under $2.5k monthly tracked revenue, then 1%; swap to `expo-iap` + own validation only if that fee matters. The iOS/Android apps must never link to the web SmartPay checkout (store anti-steering rules).
2. **SmartPay documents: found.** SmartPay publishes its merchant API inside its own site (`smartpay.tj/dev`, support@smartpay.tj). Our current `lib/payments/smartpay.ts` was written to a guessed API and is wrong on endpoint, auth, webhook signature and amount units — Task 10 rewrites it to the real API (summary in that task). Still needed from the client: the SmartPay dashboard login (issued by the SmartPay account manager), from which we take the API key and create the webhook.
3. **Decided (2026-10-16): a "company" is any logged-in user.** No new role; any logged-in user (CUSTOMER or PROVIDER) can file a sourcing request; "the company can see its own requests" = requests where `userId` matches. Pricing/payment for sourcing is out of scope (not in the estimate). Phase 3 sourcing (Tasks 14–15) should not start until this is answered; PostHog dashboards (Task 16) can.

**Estimate impact (tell the client):** Phase 2 grows from 5 h to about 8.5 h. Store billing adds ~2 h (RevenueCat webhook, store product setup), and the SmartPay rewrite adds ~1.5 h. The SmartPay rewrite was not in the estimate, but subscriptions can't go live on the web without it. Total ≈ 25.5 h / $765 (was 22 h / $660). The client's own setup is not counted: Apple Paid Apps agreement + banking/tax, Google payments profile, store prices in USD (no TJS storefront pricing), 15–30% store commission, and a new store review for the build carrying the native purchase module.

## Review Focus

1. A provider with zero reviews must sort below every rated provider under "highest rating" (NULL avg sorts last), not first — test in Task 4.
2. An expired subscription (`endDate < now()` but `isActive` still true, before the 02:00 cron runs) must not rank or show a badge — test in Task 4 and Task 9.
3. A `category`/`city` profile value that is not in the canonical list (e.g. the Tajik display string sent back by a client) is rejected with 400, not saved — test in Task 2.
4. Portfolio image URLs must pass `isSafeAvatarUrl`-style checks (Blob host or `/uploads/`); a `javascript:` or foreign URL is rejected — test in Task 2.
5. Search `q` with `%`, `_` or a quote must not break the query or match everything — escape LIKE wildcards; test in Task 4.

---

## File Map

| File | Change | Tasks |
|---|---|---|
| `apps/web/prisma/schema.prisma` + new migration | User fields, `PortfolioProject`, `SourcingRequest` | 1, 14 |
| `../dastiyor-admin/prisma/schema.prisma` | mirror the same models | 1, 14 |
| `apps/web/app/api/profile/route.ts` | read/save new fields | 2 |
| `apps/web/app/api/profile/portfolio/route.ts`, `[id]/route.ts` | portfolio CRUD + reorder | 2 |
| `apps/web/app/provider/profile/edit/page.tsx`, `app/provider/portfolio/page.tsx` | web edit form, portfolio manager | 3 |
| `apps/mobile/app/edit-profile.tsx` | mobile edit fields + gallery picking | 3 |
| `apps/web/lib/professionals.ts` | search/sort/tier/pagination query | 4, 9 |
| `apps/web/app/api/professionals/route.ts` | search endpoint | 4 |
| `apps/web/app/api/users/[id]/route.ts` | public profile payload | 5 |
| `apps/web/app/(public)/provider/[id]/page.tsx` | web profile redesign | 6 |
| `apps/mobile/app/provider/[id].tsx` | mobile profile redesign | 6 |
| `apps/web/app/professionals/page.tsx` | web search page | 7 |
| `apps/mobile/app/(tabs)/professionals.tsx`, `(tabs)/_layout.tsx` | mobile search tab | 8 |
| `apps/web/app/api/config/route.ts` | `subscriptionsEnabled`, `mobilePurchaseEnabled` | 9, 10 |
| `apps/web/lib/payments/smartpay.ts`, `app/api/webhooks/smartpay/route.ts`, `app/api/payments/status/route.ts` | SmartPay real API + signature | 10 |
| `apps/web/lib/payments/revenuecat.ts`, `app/api/webhooks/revenuecat/route.ts`, `app/api/subscription/sync/route.ts` | store subscriptions | 11 |
| `apps/mobile/lib/purchases.ts`, `app/subscription.tsx`, `app/(tabs)/profile.tsx`, `app/respond/[id].tsx` | in-app purchase flow | 13 |
| `apps/web/app/api/sourcing/route.ts`, `app/sourcing/page.tsx` | sourcing form + API + team email | 14 |
| `../dastiyor-admin/app/api/sourcing/**`, `app/(dashboard)/admin/sourcing/page.jsx` | admin queue + company email | 15 |
| `docs/analytics/posthog.sql` | analytics views + dashboard queries | 16 |
| `packages/types/index.ts` | `ProfessionalCard`, `PortfolioProject`, `PublicProfile`, `SourcingRequest` | 2, 4, 5, 14 |

---

# Phase 1 · Profiles and search (Days 1–3, 12 h)

### Task 1: Schema — profile fields and portfolio (`pd-schema`, 0.5 h)

**Files:**
- Modify: `apps/web/prisma/schema.prisma`, `../dastiyor-admin/prisma/schema.prisma`
- Create: `apps/web/prisma/migrations/20261016000000_profile_portfolio/migration.sql`

**Interfaces — Produces:**
```prisma
// on User
experienceYears Int?
city            String?
categories      String[]          @default([])
portfolio       PortfolioProject[]

model PortfolioProject {
  id          String   @id @default(cuid())
  title       String
  description String?
  images      String[] @default([])  // max 8 URLs
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, order])
}
```

- [ ] **Step 1:** Add the fields/model above to the web schema.
- [ ] **Step 2:** `cd apps/web && npx prisma migrate dev --create-only --name profile_portfolio`; confirm the SQL only contains `ALTER TABLE "User" ADD COLUMN` ×3 and `CREATE TABLE "PortfolioProject"` + index. Rename the folder to the date above if needed.
- [ ] **Step 3:** `npx prisma migrate deploy` (this is production — additive only), then `npx prisma generate`.
- [ ] **Step 4:** Copy the same additions into `dastiyor-admin/prisma/schema.prisma`; run `npx prisma generate` there (do **not** `db push` from admin).
- [ ] **Step 5:** `pnpm --filter @dastiyor/web exec tsc --noEmit` → no errors. Commit both repos: `feat: provider experience, city, categories and portfolio schema`.

### Task 2: Profile + portfolio API (`pd-api`, `pd-upload`, 1.5 h)

**Files:**
- Modify: `apps/web/app/api/profile/route.ts` (GET select + PUT body)
- Create: `apps/web/app/api/profile/portfolio/route.ts` (GET list, POST create, PATCH reorder), `apps/web/app/api/profile/portfolio/[id]/route.ts` (PUT, DELETE)
- Modify: `packages/types/index.ts`, `apps/web/lib/i18n/api-errors.ts`, `apps/mobile/lib/serverErrors.ts`
- Test: `apps/web/app/api/profile/__tests__/route.test.ts`, `apps/web/app/api/profile/portfolio/__tests__/route.test.ts`

**Interfaces — Produces:**
- `PUT /api/profile` accepts `experienceYears?: number | null` (int 0–60), `city?: string | null` (∈ `CITIES`), `categories?: string[]` (each ∈ `getCategories()` names, max 5).
- `PortfolioProject` type: `{ id: string; title: string; description: string | null; images: string[]; order: number }`.
- `GET /api/profile/portfolio` → `{ projects: PortfolioProject[] }` (own, by `order`).
- `POST` body `{ title, description?, images }` → `{ project }`; title 1–100 chars, description ≤ 1000, images 0–8, max 20 projects per user. PROVIDER only (403 otherwise).
- `PUT /[id]` same body; `DELETE /[id]`; both 404 when the project is not the caller's.
- `PATCH /api/profile/portfolio` body `{ order: string[] }` (ids) → sets `order` = index, ignoring ids not owned.
- Photo upload reuses `POST /api/upload` unchanged (5 MB, jpeg/png/gif/webp). Image URLs are validated with `isSafeAvatarUrl` from `lib/avatar-url.ts`.

New error strings: `'Неизвестный город'`, `'Неизвестная категория'`, `'Слишком много проектов'`, `'Слишком много фотографий'`, `'Проект не найден'`.

- [ ] **Step 1: Failing tests** — profile route: `rejects a city not in CITIES` (400 `'Неизвестный город'`), `rejects a Tajik category label` (400 `'Неизвестная категория'`), `saves experienceYears, city, categories`. Portfolio route: `creates a project for a provider`, `403 for a customer`, `rejects 9 images`, `rejects a javascript: image URL`, `rejects the 21st project`, `DELETE of another user's project is 404`, `PATCH reorders only owned ids`.
- [ ] **Step 2:** `pnpm --filter @dastiyor/web test app/api/profile` → FAIL.
- [ ] **Step 3:** Implement. Use `requireAuth`, `sanitizeString`, `getCategories()`; audit via `lib/audit.ts` on create/delete. Add the Tajik + en/tj error entries.
- [ ] **Step 4:** Tests PASS, including `apps/mobile/lib/__tests__/serverErrors.test.ts`.
- [ ] **Step 5:** tsc both apps; commit `feat(api): profile fields and portfolio projects`.

### Task 3: Edit profile on web and mobile (`pd-web`, `pd-mobile`, 2 h)

**Files:**
- Modify: `apps/web/app/provider/profile/edit/page.tsx` — experience number input, city `<select>`, category multi-select (checkbox list from `/api/config`, first paint from `CATEGORIES`).
- Modify: `apps/web/app/provider/portfolio/page.tsx` — replace the "completed tasks with images" gallery with a client manager for `PortfolioProject`s: add/edit (title, description, photos via `/api/upload`), delete, move up/down (calls `PATCH` with the new order). Up/down buttons instead of drag-and-drop.
- Modify: `apps/mobile/app/edit-profile.tsx` — same three fields (provider only) plus a "Portfolio" section; photos via `expo-image-picker` (already installed) → `/api/upload` multipart.
- Modify: `apps/web/lib/i18n/locales/{ru,tj}.json`, `apps/mobile/lib/i18n.ts`
- Test: `apps/web/app/provider/portfolio/__tests__/page.test.tsx`, `apps/mobile/app/__tests__/edit-profile.test.tsx`

- [ ] **Step 1: Failing tests** — web: `adds a project and lists it`, `move up sends PATCH with swapped ids`, `delete removes the card`. Mobile: `shows experience/city/categories only for PROVIDER`, `sends canonical Russian category names, not translated labels`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; category/city labels via `terms.ts`, values stay Russian. **Step 4:** PASS + tsc both apps.
- [ ] **Step 5:** Commit `feat: edit experience, city, categories and portfolio on web and mobile`.

### Task 4: Search query + API (`se-api`, `se-sort`, `se-page`, `tp-rank` hook, 2 h)

**Files:**
- Create: `apps/web/lib/professionals.ts`, `apps/web/app/api/professionals/route.ts`
- Modify: `packages/types/index.ts`
- Test: `apps/web/lib/__tests__/professionals.test.ts`, `apps/web/app/api/professionals/__tests__/route.test.ts`

**Interfaces — Produces:**
```ts
export type ProfessionalSort = 'rating' | 'reviews' | 'completed' | 'newest';
export interface ProfessionalSearch { q?: string; category?: string; city?: string; sort?: ProfessionalSort; page?: number; limit?: number }
export interface ProfessionalCard {
  id: string; fullName: string; avatar: string | null; city: string | null;
  categories: string[]; experienceYears: number | null; isVerified: boolean;
  avgRating: number | null; reviewCount: number; completedCount: number;
  tier: 'basic' | 'standard' | 'premium' | null;   // null when subscriptions are off
}
export function searchProfessionals(p: ProfessionalSearch): Promise<{ items: ProfessionalCard[]; total: number; page: number; limit: number }>;
```
- `GET /api/professionals?q&category&city&sort&page&limit` → that object. Public (no auth), `RATE_LIMITS` preset `api` (or closest existing read preset) by IP. `limit` default 20, max 50; `page` ≥ 1; invalid `sort` → `'rating'`.

**Query (one `prisma.$queryRaw` with `Prisma.sql` fragments):** `role = 'PROVIDER'`; `q` → `ILIKE` on `fullName`, `skills`, `bio` with `%`/`_`/`\` escaped; `category` → `$1 = ANY(categories)`; `city` → equality. Aggregates via LEFT JOIN subqueries: `AVG(rating)`/`COUNT(*)` from `Review WHERE hidden = false`, `COUNT(*)` from `Task WHERE status='COMPLETED'` grouped by assignee. Tier: LEFT JOIN `Subscription` where `isActive AND "endDate" > now()`. Order: when subscriptions enabled, `tierRank` first (premium 3, standard 2, basic 1, none 0) DESC; then sort column DESC `NULLS LAST`; then `createdAt DESC` as tie-break. Separate `COUNT(*)` with the same WHERE for `total`. `ponytail:` comment — aggregates computed per query; add materialized counters if providers exceed ~10k.

- [ ] **Step 1: Failing tests** (lib tests mock `prisma.$queryRaw` and assert on generated SQL text/params; route tests mock `searchProfessionals`):
  - `escapes LIKE wildcards in q` — `q='50%_'` → param `'%50\\%\\_%'`.
  - `unrated providers sort after rated under rating` — SQL contains `NULLS LAST`.
  - `tier ranks first only when SUBSCRIPTIONS_ENABLED` — with flag off, ORDER BY has no tierRank and `tier` is null in results.
  - `expired subscription does not count` — SQL subscription join contains `"endDate" > now()`.
  - route: `clamps limit to 50`, `defaults bad sort to rating`, `passes category/city through`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Manual check against the shared DB (read-only): `curl 'localhost:3000/api/professionals?sort=reviews&limit=3'` returns 3 items and a `total`.
- [ ] **Step 6:** Commit `feat(api): professional search with filters, sorting and pagination`.

### Task 5: Public profile payload (`pr-header`/`pr-gallery` data, 0.5 h)

**Files:** Modify `apps/web/app/api/users/[id]/route.ts`, `packages/types/index.ts`; Test `apps/web/app/api/users/[id]/__tests__/route.test.ts`

**Interfaces — Produces:** `PublicProfile` = existing response `user` plus `experienceYears`, `city`, `categories`, `isVerified`, `portfolio: PortfolioProject[]`, `ratingBreakdown: Record<1|2|3|4|5, number>` (via `review.groupBy` on `rating`, `hidden: false`), `tier` (same rules as Task 4; reuse a `getActiveTier(userId)` helper exported from `lib/professionals.ts`). Existing fields keep their names — mobile already reads them.

- [ ] Failing tests: `includes portfolio ordered by order`, `ratingBreakdown fills missing stars with 0`, `excludes hidden reviews`, `tier null when subscriptions disabled`. → implement → PASS → commit `feat(api): portfolio and rating breakdown on public profile`.

### Task 6: Profile redesign on web and mobile (`pr-header`, `pr-gallery`, `pr-mobile`, `pr-i18n`, 2.5 h)

**Files:**
- Modify: `apps/web/app/(public)/provider/[id]/page.tsx` (server component; it queries Prisma directly — add the same fields, or call a shared `getPublicProfile(id)` extracted into `lib/professionals.ts` from Task 5 so the route and page don't drift).
- Modify: `apps/mobile/app/provider/[id].tsx`
- Modify: locales (ru/tj web, ru/tj/en mobile)
- Test: `apps/web/app/(public)/provider/[id]/__tests__/page.test.tsx`, `apps/mobile/app/__tests__/provider-profile.test.tsx`

Sections, both platforms: header (avatar, name, verified mark, avg rating + review count, experience, city, categories via `terms.ts`, completed tasks, `<TierBadge tier={tier} />` — create `apps/web/components/TierBadge.tsx` and `apps/mobile/components/TierBadge.tsx` here, rendering nothing for `null`; Tasks 7 and 8 reuse them); portfolio grid (title + photos; tap → full image); reviews with 5-row breakdown bar and the task title per review. Mobile adds a "Message" button → `router.push('/chat/' + id)`.

- [ ] Failing tests: `renders category in Tajik when locale is tj but links stay canonical`, `hides portfolio section when empty`, `shows tier badge only when tier is set`, mobile `message button opens chat`. → implement → PASS → tsc → commit `feat: provider profile with portfolio, breakdown and tier`.

### Task 7: Web search page (`se-web`, 1.5 h)

**Files:** Rewrite `apps/web/app/professionals/page.tsx` (server component reading `searchParams`, calling `searchProfessionals` directly) + `apps/web/app/professionals/Filters.tsx` (client: search box, category, city, sort; updates the URL query via `router.replace`) + `professionals.module.css`. Test `apps/web/app/professionals/__tests__/page.test.tsx`.

- Cards link to `/provider/{id}` (current button links nowhere; current city is hardcoded "Душанбе" — remove). Page-number pagination via `?page=`, total count shown, empty state reusing the existing `professionals.noProfessionals` copy.
- [ ] Failing tests: `card links to /provider/id`, `filters write canonical values to the URL`, `shows total`, `empty state`. → implement → PASS → commit `feat(web): professionals search page`.

### Task 8: Mobile search tab (`se-mobile`, 1.5 h)

**Files:** Create `apps/mobile/app/(tabs)/professionals.tsx`; modify `apps/mobile/app/(tabs)/_layout.tsx` (new tab between `tasks` and `my`, Ionicons `people`/`people-outline`); add `ProfessionalCard` component inline in the screen file unless reused. Test `apps/mobile/app/__tests__/professionals.test.tsx`.

- `FlatList` with `onEndReached` → next page until `items.length === total`; pull-to-refresh; filters from `useConfig()`; debounce `q` 300 ms; tap → `/provider/[id]`.
- [ ] Failing tests: `loads page 2 on end reached`, `stops at total`, `debounced query`, `tap opens provider screen`. → implement → PASS → `pnpm --filter @dastiyor/mobile exec tsc --noEmit` → commit `feat(mobile): professionals search tab`.

---

# Phase 2 · Subscriptions in search, on the web and in the app (Days 4–5, ≈8.5 h)

> Building isn't blocked. Going live needs: SmartPay dashboard access (Task 10), plus App Store Connect / Play Console products and a RevenueCat project (Task 12).

### Task 9: Tier badge + config flags (`tp-rank` verify, `tp-badge`, 1 h)

Ranking already lives in Task 4; this task exposes the flags the clients need.

**Files:** Modify `apps/web/app/api/config/route.ts` → add `subscriptionsEnabled: SUBSCRIPTIONS_ENABLED`, `mobilePurchaseEnabled: process.env.MOBILE_PURCHASE_ENABLED === 'true'` (kill switch for the in-app purchase UI until store products are approved); add both to the config type in `apps/mobile/lib/useConfig.ts`. Test `apps/web/app/api/config/__tests__/route.test.ts`.

- [ ] Failing tests: `config exposes both flags`. Then an end-to-end check of the badge path: run locally with `NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED=true` and a test provider holding an active premium subscription. That provider should be first on `/professionals` and show the badge. With the flag off, there's no badge and the order is normal. → implement → PASS → commit `feat: expose subscription flags to clients`.

### Task 10: Rewrite SmartPay to the real merchant API (web checkout, new — not in estimate, 1.5 h)

**SmartPay API as documented** (from the developer guide bundled in smartpay.tj, Oct 2026):

| | |
|---|---|
| Base URL | prod `https://ecomm.smartpay.tj/api/merchant`, sandbox `https://sandbox.smartpay.tj/api/merchant` |
| Auth | header `x-app-token: <API key>` (dashboard → Settings → API Keys) |
| Health | `GET /health` — call first to check the key |
| Create invoice | `POST /invoices` `{ amount, order_id, description, lifetime?, return_url?, customer_phone?, name? }`. `amount` is in **somoni** (decimal, min 2). Idempotent by `order_id`. |
| Create response | always HTTP 200: `{ result: 200, invoice_uuid, smartpay_id, payment_link }` on success, `{ result: 400, message, payment_link: null }` on error |
| Status | `GET /order/status/{order_id}` → status `open` / `Charged` / `void` |
| Webhook | configured once in the dashboard (Settings → Webhooks → HTTPS Webhook), **not** per request. It POSTs JSON `{ payment_date, amount, order_id, bank_id, invoice_number, invoice_uuid, payment_id, bank, signature }`. `amount` is in **dirams** (1 somoni = 100). Sent only on successful payment; retried for 2 days until we answer 200. |
| Signature | HMAC-SHA256 hex of `payment_date|amount|order_id|bank_id|invoice_uuid`. `payment_date` is formatted `YYYY-MM-DD HH:MM:SS` (no `T`, no fractions). The secret is shown once, when the webhook is created. |

**Files:**
- Modify `apps/web/lib/payments/smartpay.ts`. Env becomes `SMARTPAY_API_URL` (default prod above), `SMARTPAY_API_KEY`, `SMARTPAY_WEBHOOK_SECRET`; `SMARTPAY_MERCHANT_ID` / `SMARTPAY_SECRET_KEY` go away. `isSmartPayConfigured()` = API key set. `createSmartPayOrder` → `POST /invoices` with `lifetime: 1800`, `return_url`. Success only when `body.result === 200`; `paymentUrl = payment_link`, `transactionId = invoice_uuid`. Drop `callbackUrl` from `SmartPayOrderRequest`. New `getSmartPayOrderStatus(orderId): Promise<'open' | 'Charged' | 'void' | null>`.
- Replace `SmartPayCallbackData` with `SmartPayWebhook` (the fields above). `verifyWebhookSignature(body: SmartPayWebhook): boolean` uses the formula above with `crypto.timingSafeEqual`. Format the date as `payment_date.replace('T', ' ').slice(0, 19)`.
- Modify `apps/web/app/api/webhooks/smartpay/route.ts`:
  - Find the `Payment` by `smartpayOrderId = order_id`. Already COMPLETED → 200, no-op (retries are idempotent).
  - Require `amount === PLANS[plan].price * 100`. On a mismatch, log it and return 200 without activating (a non-200 would make SmartPay retry for 2 days).
  - Otherwise set `transactionId = payment_id`, `paymentMethod = bank` and activate the subscription as today.
- Modify `apps/web/app/api/payments/status/route.ts`: while a payment is PENDING, ask `getSmartPayOrderStatus`. `void` → mark FAILED. Activation stays webhook-only.
- Keep the dev simulator (`/payment/dev-checkout`) working: with no secret set outside production, signatures are skipped as today.
- Tests: update `lib/payments` tests and `app/api/webhooks/smartpay/__tests__/route.test.ts`:
  - `verifyWebhookSignature accepts the known vector`. Secret `test_secret`, body `{ payment_date: '2026-01-15T14:30:00', amount: 1500000, order_id: 'ORD-123456', bank_id: 1, invoice_uuid: 'a1b2c3d4-e5f6-7890-abcd-ef0123456789' }` → signature `43b359b4033ad9f959af3e5b2005f387d5d3c831c319224de51a6c2d72ed7176`.
  - `accepts payment_date with microseconds` (`'2026-01-15T14:30:00.879779'`, same signature).
  - `rejects a tampered amount`.
  - `create returns failure when result is 400 inside HTTP 200`.
  - `webhook with amount in dirams activates`.
  - `wrong amount does not activate but returns 200`.
  - `duplicate webhook is a no-op`.
- [ ] FAIL → implement → PASS → commit `fix(payments): SmartPay real merchant API, dashboard webhook and HMAC signature`.
- [ ] **Manual, once credentials arrive:** `curl -H "x-app-token: $SMARTPAY_API_KEY" https://sandbox.smartpay.tj/api/merchant/health`. Then create the HTTPS webhook → `https://www.dastiyor.com/api/webhooks/smartpay` with signature on, and store the secret in Vercel (Dastiyor team) as `SMARTPAY_WEBHOOK_SECRET`. Pay one sandbox invoice end to end.

### Task 11: In-app purchase server side — RevenueCat webhook + sync (part of `mp-pay`, `mp-status`, 1.5 h)

**Interfaces — Produces:**
- `apps/web/lib/payments/revenuecat.ts`:
  - `getStoreEntitlement(userId: string): Promise<{ plan: PlanId; expiresAt: Date } | null>`. Calls `GET https://api.revenuecat.com/v1/subscribers/{userId}` with `Authorization: Bearer ${REVENUECAT_SECRET_KEY}`. Picks the highest active entitlement among `premium` > `standard` > `basic` (entitlement ids = `PlanId`s).
  - `syncStoreSubscription(userId: string): Promise<void>`. Upserts `Subscription` from the store entitlement **without shortening a later SmartPay subscription**. When the store expiry is later than the stored `endDate`, it takes the store plan + endDate. When the store has no active entitlement, it leaves a still-valid row alone.
- `POST /api/webhooks/revenuecat`. Rejects (401) unless `Authorization` equals `REVENUECAT_WEBHOOK_AUTH`. Reads `event.app_user_id`, calls `syncStoreSubscription`, and returns 200. Unknown event types are fine: RevenueCat's own guidance is to re-fetch subscriber state rather than interpret each event, which also makes duplicates harmless.
- `POST /api/subscription/sync` (`requireAuth`). The app calls it right after a purchase or restore so the server doesn't wait for the webhook. Returns the same shape as `GET /api/subscription`.
- `GET /api/subscription` gains `source: 'web' | 'store' | null`, so the app can say "Manage in App Store / Google Play".
- No `Payment` rows for store purchases (amounts are store-currency, net of commission). Store revenue is read in RevenueCat; the PostHog revenue insight stays SmartPay-only (RevenueCat's PostHog integration can add store revenue), and active subscriptions by plan cover both. Add the matching `ponytail:` comment.
- Tests in `app/api/webhooks/revenuecat/__tests__/route.test.ts` and `lib/__tests__/revenuecat.test.ts`:
  - `401 on wrong auth header`.
  - `premium entitlement upserts premium with store expiry`.
  - `store expiry earlier than an existing SmartPay endDate leaves it`.
  - `EXPIRATION with no active entitlement does not delete a valid web subscription`.
  - `sync requires auth`.
- [ ] FAIL → implement → PASS → commit `feat(api): store subscriptions via RevenueCat`.

### Task 12: Store + RevenueCat setup (manual, ~1.5 h, client account access needed)

- [ ] App Store Connect: confirm the Paid Apps agreement, banking and tax are active. Create one subscription group "Dastiyor Pro" with auto-renewable products `dastiyor_basic_1w` (1 week), `dastiyor_standard_1m` and `dastiyor_premium_1m` (1 month). Prices are set per storefront by the client, in USD for Tajikistan. Enroll in the Small Business Program (15%).
- [ ] Play Console: the same three subscription products with base plans `weekly` / `monthly`.
- [ ] RevenueCat: one project with an iOS app (App Store Connect API key + in-app purchase key) and an Android app (Play service account).
  - Entitlements `basic`, `standard`, `premium`, each attached to its product.
  - Offering `default` with three packages.
  - Webhook → `https://www.dastiyor.com/api/webhooks/revenuecat` with an Authorization value.
- [ ] Env: Vercel (Dastiyor team) gets `REVENUECAT_SECRET_KEY` and `REVENUECAT_WEBHOOK_AUTH`. EAS env gets `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (public SDK keys).

### Task 13: Mobile in-app purchase flow (`mp-plans`, `mp-pay`, `mp-status`, `mp-entry`, 3 h)

**Files:**
- `pnpm --filter @dastiyor/mobile exec npx expo install react-native-purchases` (no `-ui`: the paywall is our own screen, so it matches the app and the ru/tj copy). This is a native module, so it needs a new EAS build; Expo Go only gets RevenueCat's mock "Preview API Mode".
- Create `apps/mobile/lib/purchases.ts`:
  - `initPurchases()` — `Purchases.configure({ apiKey })` using the platform key.
  - `identify(userId)` → `Purchases.logIn(userId)`, called after login and on app start when a session exists.
  - `resetPurchases()` → `Purchases.logOut()`, called from the existing logout path.
  - The app user id **is** our `User.id`, which is what the server sync relies on.
- Create `apps/mobile/app/subscription.tsx`:
  - Current plan and expiry from `GET /api/subscription`.
  - Plan cards from `Purchases.getOfferings()` — prices from `package.product.priceString`, never from `PLANS`.
  - Feature lines per plan from our i18n.
  - Buy → `Purchases.purchasePackage(pkg)` → `POST /api/subscription/sync` → success state.
  - "Restore purchases" → `Purchases.restorePurchases()` → sync (an Apple requirement).
  - "Manage subscription" → `Purchases.showManageSubscriptions()` when `source === 'store'`.
  - Terms and privacy links (`lib/legal.ts`), required on a subscription screen.
  - A user who cancels the purchase sees no error.
- Modify `apps/mobile/app/(tabs)/profile.tsx`: a "Subscription" row for providers, shown only when `config.subscriptionsEnabled && config.mobilePurchaseEnabled`.
- Modify `apps/mobile/app/respond/[id].tsx:76`: the `SUBSCRIPTION_REQUIRED` alert gets a "View plans" action → `/subscription` (same condition). It must never link to the web checkout.
- Tests (mock `react-native-purchases`), in `apps/mobile/app/__tests__/subscription.test.tsx` and `apps/mobile/lib/__tests__/purchases.test.ts`:
  - `renders store price strings`.
  - `purchase calls sync then shows success`.
  - `user cancel shows no error`.
  - `restore calls sync`.
  - `entry hidden when mobilePurchaseEnabled false`.
  - `logout calls Purchases.logOut`.
- [ ] FAIL → implement → PASS → tsc → commit `feat(mobile): subscriptions via App Store and Google Play`.
- [ ] **Manual:** a sandbox purchase on a TestFlight build and a Play internal-testing build. The server `Subscription` row should update within seconds via sync, and the webhook should also arrive (check Vercel logs). Ship as a new store version.

---

# Phase 3 · Sourcing service and monitoring (Days 6–7, 5 h)

> Tasks 14–15 wait on Open Question 3 (who is a "company"). Task 16 can start any time.

### Task 14: Sourcing request — schema, API, form, team email (`so-form`, `so-api`, `so-notify` part 1, 2 h)

**Files:**
- Modify both `schema.prisma` files + migration `20261016010000_sourcing_request`:
```prisma
model SourcingRequest {
  id              String    @id @default(cuid())
  category        String
  city            String
  headcount       Int
  experienceYears Int?
  budget          String?
  deadline        DateTime?
  description     String
  contactName     String
  contactPhone    String
  contactEmail    String?
  status          String    @default("NEW") // NEW, IN_PROGRESS, PROPOSED, CLOSED
  adminNotes      String?
  proposedIds     String[]  @default([])    // provider User ids
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  @@index([status, createdAt])
  @@index([userId])
}
```
- Create `apps/web/app/api/sourcing/route.ts`: `POST` (requireAuth; `checkRateLimit` 5/hour/user; category/city canonical; headcount 1–500; description 20–2000 through the spam/XSS checks in `lib/validation.ts`; `isValidPhone`; `isValidEmail` if given) → `{ request }`; then fire-and-forget email to `getCompany().email` via `lib/notifications/email.ts` with the request summary. `GET` → caller's own requests, newest first, including `proposedIds` resolved to `{ id, fullName }`.
- Create `apps/web/app/sourcing/page.tsx` (+ client form component): form + "My requests" list with status labels; logged-out users → `/login?next=/sourcing`. Footer/header link only if trivial; otherwise reachable by URL.
- Locales + error-string tables; `packages/types` `SourcingRequest`.
- Tests: `app/api/sourcing/__tests__/route.test.ts` — `creates and emails the team`, `email failure does not fail the request`, `rejects non-canonical city`, `rate limit returns 429 on 6th`, `GET returns only own`.
- [ ] FAIL → migrate (additive) → implement → PASS → commit (both repos) `feat: sourcing requests for companies`.

### Task 15: Admin queue + company email (`so-admin`, `so-notify` part 2, 1 h) — **repo `dastiyor-admin`**

**Files** (follow the `admin/subscriptions` page + `api/subscriptions` route pattern already there; JS, Next 14):
- Create `app/api/sourcing/route.js` (GET list, filter by status), `app/api/sourcing/[id]/route.js` (PATCH `status`, `adminNotes`, `proposedIds`; validates ids are PROVIDER users).
- Create `app/(dashboard)/admin/sourcing/page.jsx` — table (date, company contact, category, city, headcount, status), detail drawer with notes, status select, provider picker (search by name via the admin's existing users API) to attach proposed professionals. Add the menu entry next to Subscriptions.
- On PATCH that moves status to `PROPOSED`: send the company an email (contactEmail, else the requester's account email) listing proposed names + profile links `https://www.dastiyor.com/provider/{id}`. Admin has no email lib — add `lib/brevo.js` with one `sendEmail({ to, subject, html })` that POSTs to `https://api.brevo.com/v3/smtp/email` using `BREVO_API_KEY` (same key as the web project; set it in the admin Vercel project). No-op with a console warning when unset.
- [ ] Manual verification against the shared DB: create a request on web, see it in admin, attach a provider, set PROPOSED → email arrives (use your own address as contactEmail), web "My requests" shows the proposed professional. Commit in `dastiyor-admin`.

### Task 16: PostHog dashboards (`mo-setup`, `mo-activity`, `mo-revenue`, 2 h) — no app code

PostHog replaces Grafana (decided 2026-10-16). The mobile app already ships `posthog-react-native`, so there's one tool for app events and database metrics. PostHog's data warehouse syncs Supabase tables on a schedule, and dashboards are built from SQL insights. Free tier: 1M synced rows/month, then $0.000015/row. Incremental syncs keep us far below that.

- [ ] **Step 1: Analytics views without personal data.** In the Supabase SQL editor, create schema `analytics` with views exposing only the columns the dashboards need:
  - `analytics.users (id, role, city, "createdAt", "updatedAt")` — no email, phone, password, tokens.
  - `analytics.tasks (id, category, city, status, "createdAt", "updatedAt")`.
  - `analytics.responses (id, "taskId", status, "createdAt", "updatedAt")`.
  - `analytics.payments (id, amount, currency, status, plan, "createdAt", "updatedAt")`.
  - `analytics.subscriptions (id, plan, "isActive", "startDate", "endDate")`.
  - `analytics.sourcing_requests (id, category, city, status, "createdAt", "updatedAt")` (after Task 14).
  - Check the real column names against `schema.prisma` before running.
- [ ] **Step 2: Read-only role.** `CREATE ROLE posthog_ro LOGIN PASSWORD '…'; GRANT USAGE ON SCHEMA analytics TO posthog_ro; GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO posthog_ro;`. No grant at all on `public`. Since the views run as their owner, the role sees only the view columns. Store the password in the team password manager, not the repo.
- [ ] **Step 3: Link the source.** PostHog → Data pipeline → Sources → Postgres, schema `analytics`, SSL on.
  - Use the Supabase **pooler** host (session mode, port 5432). PostHog connects over IPv4 only, and Supabase's direct host is IPv6.
  - Sync each view **incrementally on `updatedAt`**. `subscriptions` has no `updatedAt`, so use a full sync for it; the table is tiny.
  - Daily frequency is enough. Fallback: if PostHog doesn't list views, use `xmin` sync on the base tables with a separate schema of copied tables. Note what was done in the doc below.
- [ ] **Step 4: Two dashboards from SQL insights.**
  - Activity: new users by role per day and week; tasks posted by category and by city; average responses per task; completed tasks per day.
  - Revenue: SmartPay `payments` COMPLETED sum by plan per day; active subscriptions (`"isActive" AND "endDate" > now()`) by plan; expiring in the next 7 days; sourcing requests by status.
  - Optional, no code: turn on RevenueCat's built-in PostHog integration so App Store / Google Play revenue events also land in PostHog (Task 11 keeps store purchases out of `Payment`).
- [ ] **Step 5:** Save the view SQL and each insight's query in `docs/analytics/posthog.sql`, so they can be rebuilt. Commit `docs: PostHog analytics views and dashboard queries`.

---

## Estimate traceability

| Estimate id | Task |
|---|---|
| pd-schema | 1 |
| pd-api, pd-upload | 2 |
| pd-web, pd-mobile | 3 |
| se-api, se-sort, se-page | 4 |
| pr-header, pr-gallery, pr-mobile, pr-i18n | 5, 6 |
| se-web | 7 |
| se-mobile | 8 |
| tp-rank | 4 (query), 9 (verify) |
| tp-badge | 9 |
| mp-plans, mp-pay, mp-status, mp-entry | 11, 12, 13 (store billing instead of SmartPay in the app) |
| — (new) SmartPay real API | 10 |
| so-form, so-api | 14 |
| so-admin | 15 |
| so-notify | 14 (team), 15 (company) |
| mo-setup, mo-activity, mo-revenue | 16 |
