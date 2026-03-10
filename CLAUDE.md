# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dastiyor (https://dastiyor.com) is an online services marketplace for Tajikistan where customers post tasks and service providers respond. Built with Next.js 16 (App Router), React 19, Prisma ORM, and TypeScript. The UI language is primarily Russian.

## Commands

```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # prisma migrate deploy + next build
npm run lint             # ESLint (next/core-web-vitals + typescript)
npm test                 # Jest tests
npm test -- --testPathPattern=path/to/test  # Run single test file
npm run test:watch       # Jest watch mode
npm run test:coverage    # Jest coverage

npx prisma generate      # Regenerate Prisma Client after schema changes
npx prisma migrate dev   # Create + apply migration (dev)
npx prisma migrate deploy # Apply migrations (prod)
npx prisma studio        # Database GUI
npx prisma db seed       # Seed sample data (7 tasks + users)
```

## Architecture

### Routing & Layouts

The app uses Next.js App Router with three distinct layout zones:

- **Public pages** (`app/layout.tsx`): Renders Header + Footer via `ClientLayoutWrapper`, which hides them on dashboard routes
- **Customer dashboard** (`app/customer/layout.tsx`): Server-side auth check (JWT cookie, role=CUSTOMER), fixed sidebar + top bar
- **Provider dashboard** (`app/provider/layout.tsx`): Same pattern, role=PROVIDER
- **Admin panel** (`app/admin/layout.tsx`): JWT role=ADMIN check, dark sidebar

Each dashboard layout does its own auth/redirect — there is no middleware. Auth is cookie-based JWT (`token` cookie) verified via `lib/auth.ts` (jose HS256, 24h expiry).

### API Routes

All API routes live under `app/api/`. They follow the pattern:
1. Read JWT from cookies via `cookies().get('token')`
2. Verify with `verifyJWT()` from `lib/auth.ts`
3. Use Prisma client from `lib/prisma.ts`

No REST framework — each route is a standalone `route.ts` with exported `GET`/`POST`/`PUT`/`DELETE` functions.

### Database

- PostgreSQL on Supabase (no local DB). `POSTGRES_PRISMA_URL` (pooled) and `POSTGRES_URL_NON_POOLING` (direct, for migrations)
- Schema: `prisma/schema.prisma` — models: User, Task, Response, Subscription, Payment, Message, Review, Notification, PasswordReset, VerificationCode, TaskFavorite
- IDs are CUIDs. Roles are string enums: CUSTOMER, PROVIDER, ADMIN
- Task statuses: OPEN, IN_PROGRESS, COMPLETED, CANCELLED
- Response statuses: PENDING, ACCEPTED, REJECTED

### Key Libraries

- `@/lib/auth.ts` — JWT sign/verify (jose)
- `@/lib/prisma.ts` — Prisma singleton
- `@/lib/validation.ts` — Input validation + sanitization (XSS, spam detection)
- `@/lib/rate-limit.ts` — In-memory rate limiter
- `@/lib/notifications/email.ts` — Brevo email service
- `@/lib/notifications/sms.ts` — Brevo SMS notifications
- `@/lib/brevo-sms.ts` — Brevo SMS client
- `@/lib/payments/smartpay.ts` — SmartPay TJ payment gateway client
- `@/lib/payments/index.ts` — Shared plan configs + payment exports

### Path Alias

`@/*` maps to project root (e.g., `@/lib/auth`, `@/components/Header`).

### Styling

CSS Modules (`*.module.css`) + inline styles. No Tailwind. Font: Manrope (Google Fonts).

### Testing

Jest + React Testing Library. Tests live in `__tests__/` directories adjacent to source files. The jose module is explicitly un-ignored in `transformIgnorePatterns`.

### External Services

- **Supabase**: PostgreSQL hosting (required)
- **Brevo**: Transactional email + SMS — optional
- **SmartPay TJ**: Payment gateway for subscriptions (https://smartpay.tj) — optional, dev simulator used when keys not set
- **Vercel**: Deployment target (Node.js 24.x)
