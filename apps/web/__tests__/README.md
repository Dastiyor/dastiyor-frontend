# Testing Guide

This project uses Jest and React Testing Library for testing. Tests are aligned with **TASK_STATUS.md** and the technical specification (**TS "Dastiyor".txt**).

## Setup

Install dependencies:
```bash
npm install
```

## Running Tests

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Test Structure

### Unit Tests (`lib/__tests__/`)
- **validation.test.ts** – Input validation: email, phone, password strength, task/response validation, sanitize, spam detection, image type/size
- **auth.test.ts** – JWT sign/verify and round-trip
- **rate-limit.test.ts** – Rate limiting (checkRateLimit, getClientIP, rateLimitExceededResponse), limits per type (auth, api, responses, upload)

### API Route Tests

#### Auth (`app/api/auth/__tests__/`)
- **login.test.ts** – Login: missing fields, invalid credentials, wrong password, success + cookie, server error
- **register.test.ts** – Register: missing fields, duplicate email, create user, password hashing
- **forgot-password/route.test.ts** – Forgot password: missing email, no enumeration when user missing, create token, lowercase email, errors
- **reset-password/route.test.ts** – Reset password POST (missing/invalid token, short password, success, hash) and GET (token validation)

#### Tasks (`app/api/tasks/__tests__/`)
- **route.test.ts** – Task creation: 401, 400 missing fields, 201 create (GET tests skipped – route has no GET)
- **accept/route.test.ts** – Accept offer: 401, 400 missing fields, 404 task, 403 not owner, 200 accept + notification, 500
- **complete/route.test.ts** – Complete task: 401, 400, 404, 403, 400 not IN_PROGRESS, 200 complete, provider balance increment
- **cancel/route.test.ts** – Cancel task: 401, 400, 404, 403 not owner, 400 not OPEN, 200 cancel, 500
- **favorite/route.test.ts** – GET (isFavorite with/without token, 400 missing taskId), POST (401, 400, add/remove favorite)
- **search/route.test.ts** – Search: 400 short query, search by q, filter category/city, pagination, 500

#### Messages & Conversations
- **app/api/messages/__tests__/route.test.ts** – GET messages (401, 400 missing userId, fetch, filter by taskId, mark read), POST (401, 400 receiver/content/self, create, imageUrl)
- **app/api/conversations/__tests__/route.test.ts** – GET: 401, grouped conversations, empty list, 500

#### Responses
- **app/api/responses/__tests__/route.test.ts** – POST: 401, 400, 201 create, 403 not provider, 403 no/expired subscription, 404 task, notification to owner
- **app/api/responses/reject/__tests__/route.test.ts** – Reject: 401, 400, 404, 403 not owner, 400 not PENDING, 200 reject + notify provider

#### Subscription & Notifications & Reviews
- **app/api/subscription/__tests__/route.test.ts** – GET (401, null, active/expired), POST (401, 400 invalid plan, create, plans), DELETE (401, 404, deactivate)
- **app/api/notifications/__tests__/route.test.ts** – GET (401, list + unreadCount), PUT (401, mark all read)
- **app/api/reviews/__tests__/route.test.ts** – GET (400 missing userId, list + stats, avg 0), POST (401, 400/404/403, rating 1–5, task completed, no duplicate, create)

### Component Tests

- **components/tasks/__tests__/TaskCard.test.tsx** – Render task, urgency badge, response count, favorite toggle, negotiable budget, link to details, share, urgent badge, View Details link
- **components/chat/__tests__/ChatInterface.test.tsx** – Empty state, fetch messages, send message, image upload, invalid file type, partner name (skipped), disabled send when empty
- **components/ui/__tests__/Toast.test.tsx** – success, error, info, warning toasts
- **components/reviews/__tests__/ReviewForm.test.tsx** – Render with provider name, warning when no rating, onReviewSubmitted callback, success state, comment textarea
- **components/subscription/__tests__/SubscriptionPlans.test.tsx** – Render plans (Базовый, Стандарт, Премиум), prices, current plan badge, subscribe API call

## Writing New Tests

### API Route Test Template
```typescript
import { GET, POST } from '../route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
    prisma: {
        // Mock Prisma methods
    },
}));

describe('/api/endpoint', () => {
    it('should handle request correctly', async () => {
        const request = new NextRequest('http://localhost/api/endpoint');
        const response = await GET(request);
        expect(response.status).toBe(200);
    });
});
```

### Component Test Template
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import Component from '../Component';

describe('Component', () => {
    it('should render correctly', () => {
        render(<Component />);
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });
});
```

## Test Coverage Goals

- API Routes: 80%+
- Components: 70%+
- Utility Functions: 90%+

## Notes

- Tests use mocked Prisma client to avoid database dependencies
- Next.js router and `jose` (JWT) are mocked in `jest.setup.js`
- Environment variables are set in `jest.setup.js`
- Align new tests with **TASK_STATUS.md** (roles, subscription gating, task/response/chat flows)
