# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dastiyor (https://www.dastiyor.com) is an online services marketplace for Tajikistan where customers post tasks and service providers respond. The UI language is Russian (primary) and Tajik.

Two roles only: **CUSTOMER** and **PROVIDER**. There is no admin panel and no ADMIN role in the app — `packages/types` still declares `'ADMIN'` in the `UserRole` union, but nothing in `apps/web` or `apps/mobile` reads it and the Prisma schema comment says `CUSTOMER, PROVIDER`.

## Monorepo Structure

```
apps/web/       # Next.js 16 App Router — the product AND the only backend
apps/mobile/    # Expo React Native app (iOS + Android)
packages/types/ # Shared API DTO types (@dastiyor/types)
tooling/tsconfig/
```

pnpm workspaces + Turborepo. Vercel builds from the repo root (`vercel.json` → `turbo build`, output `apps/web/.next`).

## Commands

```bash
# Root
pnpm dev / pnpm build / pnpm lint / pnpm test    # turbo, all apps

# Web
pnpm --filter @dastiyor/web dev                  # localhost:3000
pnpm --filter @dastiyor/web test                 # jest
pnpm --filter @dastiyor/web test lib/__tests__/auth.test.ts   # single file
pnpm --filter @dastiyor/web test -t "rejects expired"          # single test by name
pnpm --filter @dastiyor/web exec tsc --noEmit    # CI gate — run before declaring done
pnpm --filter @dastiyor/web lint

# Mobile
pnpm --filter @dastiyor/mobile dev               # expo start
pnpm --filter @dastiyor/mobile test
pnpm --filter @dastiyor/mobile exec tsc --noEmit

# Prisma (from apps/web/)
npx prisma generate      # also runs on postinstall
npx prisma migrate dev   # create + apply (dev)
npx prisma studio
npx prisma db seed
```

CI (`.github/workflows/`) runs `tsc --noEmit` → `lint` → `test` → `build` for web, and `tsc --noEmit` → `lint` → `test` for mobile. `tsc --noEmit` catches type regressions that `next build` alone lets through — it exists because one shipped to production. Jest enforces a **90% global coverage threshold** (branches/functions/lines/statements), so `--coverage` runs fail if new code is untested.

## Architecture

### Mobile and web share one backend

`apps/mobile` has no server of its own. It calls the same `apps/web/app/api/*` routes over HTTPS (`EXPO_PUBLIC_API_URL`, default `https://www.dastiyor.com`) via `apps/mobile/lib/api-client.ts`, authenticating with a **Bearer token** kept in `expo-secure-store`. The web app uses a **`token` cookie** against those same routes.

**Consequence: changing an API route changes both clients.** Response shapes are the contract in `packages/types`. Mobile-specific auth endpoints exist only for the OAuth handshake (`/api/auth/{google,apple}/mobile`, which take an access/identity token in the body instead of running a redirect flow).

### Auth

Cookie/Bearer JWT (jose HS256, 24h) signed in `lib/auth.ts`. Users carry a `tokenVersion` column; logout and password change bump it, so signature validity alone is not enough.

- **API routes** should use `requireAuth(request)` from `lib/require-auth.ts` — it handles Bearer *and* cookie, and calls `verifyJWTWithVersion` to reject revoked tokens. Roughly half the routes still call `verifyJWT` directly and skip the revocation check; prefer `requireAuth` in new code and when touching an old route.
- **Dashboard layouts** (`app/customer/layout.tsx`, `app/provider/layout.tsx`) each do their own server-side check — read cookie, verify, load the user, compare `tokenVersion`, `redirect('/login')` on any failure. There is no middleware; auth lives in the layout or the route.
- **OAuth** (`lib/oauth.ts`): matches on `googleId`/`appleId`, then falls back to matching by email and linking. The requested `role` (carried in the base64url OAuth `state` on web, in the POST body on mobile) is only honored when creating a brand-new user; an existing account keeps its stored role silently.
- **Phone gate** (`lib/phone-gate.ts`): OAuth-only users have no password and no phone, and must verify a phone before posting or accepting tasks. Routes return the `PHONE_VERIFICATION_REQUIRED` code so clients can route to `/verify-phone`.

### Database

PostgreSQL on Supabase — no local DB. `POSTGRES_PRISMA_URL` (pooled, runtime) and `POSTGRES_URL_NON_POOLING` (direct, migrations). CUIDs for ids, string enums for role/status.

17 models in `prisma/schema.prisma`. Beyond the obvious ones: `ActionLog` (audit trail, written via `lib/audit.ts`), `VerificationCode` (phone/email OTP), `DeviceToken` (Expo push) and `PushSubscription` (web push VAPID) — two separate delivery paths, `Report` (user reports), `Category`/`SystemSetting` (admin-configurable data with no admin UI to configure it).

### i18n and canonical data

Locales: `ru` (default) and `tj`, selected by the `dastiyor_locale` cookie. Client components use `useTranslation()` from `lib/i18n`; server components use `getServerTranslation()` from `lib/i18n/server.ts`.

Categories, cities and budget labels are stored, filtered and sent to the API as **canonical Russian strings** (served by `/api/config`). `lib/i18n/terms.ts` translates them **for display only** — never send the translated value back. That file is duplicated at `apps/mobile/lib/terms.ts` and the two must be edited together. A category with no `terms.ts` entry falls through to its Russian name rather than rendering blank, so admin-added categories are safe in Tajik.

### Categories are admin-managed

Categories live in the `Category` table, edited from the separate **dastiyor-admin** repo (`~/Projects/Dastiyor/dastiyor-admin`), which points at this same database. `lib/categories.ts` → `getCategories()` reads that table and falls back to the static list in `lib/config-fallback.ts` when it is empty or unreachable.

**Both the picker (`/api/config`) and the task-creation allow-list (`POST /api/tasks`) must call `getCategories()`** — if they diverge, the form offers a category the API then rejects with 400. `getCategories()` imports Prisma, so client components read `/api/config` and use `CATEGORIES` from `lib/config-fallback.ts` as their first-paint value; never import the route module from a client component.

### Company contact details are admin-managed

The footer's Contacts column comes from `SystemSetting['company']`, a JSON blob written by dastiyor-admin (Settings → Company). `lib/company.ts` → `getCompany()` reads it and merges over `lib/company-defaults.ts`, per key so a field cleared in the panel stays cleared. `app/layout.tsx` reads it server-side and passes it to `<Footer company={...} />` — do not fetch it from the client, the footer is on every public page. Seed with `prisma/seed-company.ts`.

The logo and favicon inputs on that admin page are inert — bare `<input type="file">` with no handler. They save nothing, so there is no image field to read.

Cities have no table and stay static in `lib/config-fallback.ts`. Seed a fresh database with `prisma/seed-categories.ts`. Note `/api/config` has `revalidate = 3600` and mobile caches for 10 minutes, so a newly added category can take up to an hour to appear.

### Feature flags

`lib/features.ts` gates subscriptions/paid plans off via `NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED` and `SUBSCRIPTION_GATE_ENABLED`. Subscription code, routes and the SmartPay integration are all live but hidden; don't delete them as dead code.

### Key libraries

- `lib/require-auth.ts`, `lib/auth.ts` — auth (above)
- `lib/prisma.ts` — Prisma singleton
- `lib/validation.ts` — input sanitization, XSS and spam checks
- `lib/rate-limit.ts` — Upstash Redis rate limiter with an in-memory fallback when `UPSTASH_REDIS_REST_URL`/`KV_REST_API_URL` is unset. **Only the Redis path enforces limits across serverless instances** — in-memory is a dev/CI convenience, not production protection. Presets in `RATE_LIMITS`.
- `lib/audit.ts` — writes `ActionLog`; called fire-and-forget
- `lib/notifications/` — Brevo email + SMS; `lib/web-push.ts` for VAPID push
- `lib/payments/smartpay.ts` — SmartPay TJ; falls back to a dev simulator when keys are absent
- `lib/i18n/`, `lib/features.ts`, `lib/phone-gate.ts` — above
- `lib/env-validation.ts` exports `validateEnv()` but **nothing calls it**. It is not a startup check.

### Styling

CSS Modules (`*.module.css`) + inline styles. No Tailwind. Font: Manrope. Icons: `lucide-react`.

### Testing

Jest + React Testing Library, tests in `__tests__/` next to the source. `jest.config.js` un-ignores ESM packages (`jose`, `@upstash/*`) through a pnpm-aware `transformIgnorePatterns`, and maps `@upstash/*` to hand-written mocks in `__mocks__/`. There is no Playwright/E2E setup (it was removed). Mobile uses `jest-expo` with `@testing-library/react-native`.

### External services

Supabase (required). Optional, each degrading gracefully when unset: Brevo (email/SMS), SmartPay TJ (payments), Upstash Redis (rate limiting), Vercel Blob (uploads), VAPID web push, Sentry (`sentry.{client,server}.config.ts`), PostHog (mobile analytics only). One Vercel cron: `/api/cron/expire-subscriptions` daily at 02:00.
