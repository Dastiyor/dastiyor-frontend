# Dastiyor - Online Services Marketplace

A full-featured online services marketplace platform where customers post service tasks and service providers (contractors) respond and complete them. Built with Next.js 16, React 19, Prisma, and TypeScript.

![Next.js](https://img.shields.io/badge/Next.js-16.1.4-black)
![React](https://img.shields.io/badge/React-19.2.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D3748)

## 🌟 Features

### User Roles
- **Guest**: Browse tasks, view public information, sign up/login
- **Customer**: Post tasks, manage responses, chat with providers, leave reviews, dedicated sidebar navigation
- **Service Provider**: Browse tasks, respond to tasks (with subscription), manage profile, view reviews, dedicated sidebar navigation
- **Administrator**: Full platform management, user moderation, analytics

### Core Functionality

#### Authentication & Authorization
- Email-based registration and login
- Password recovery with secure token system
- Role-based access control (Customer, Provider, Admin)
- JWT-based session management
- Rate limiting for security

#### Task Management
- **Task Creation**: Multi-step form with category, subcategory, description, location, budget, urgency, due date, and image uploads
- **Task Feed**: Advanced filtering via sidebar (Category, Location, Budget, Urgency, Date) and sorting options (Newest, Oldest, Budget High/Low)
- **Task Status**: OPEN → IN_PROGRESS → COMPLETED / CANCELLED
- **Task Details**: Full task information with responses, provider selection, and status management

#### Subscription System (Monetization)
- **Basic Plan**: 7 days, 15 responses per day
- **Standard Plan**: 30 days, 50 responses per month
- **Premium Plan**: 30 days, unlimited responses + priority placement in task feed
- Subscription validation before allowing responses
- Auto-expiration and status tracking

#### Response System
- Providers can respond to tasks with:
  - Proposed price
  - Message/comment
  - Estimated completion time
- Customers can:
  - View all responses
  - Accept a provider
  - Reject responses
- Response status tracking (PENDING, ACCEPTED, REJECTED)

#### Communication
- One-to-one chat between customers and providers
- Message history with read receipts
- Image sharing in messages
- Task-context messaging

#### Reviews & Ratings
- 1-5 star rating system
- Text comments
- Automatic rating calculation
- Reviews visible on provider profiles
- Reviews cannot be edited (immutable)

#### Notifications
- In-app notification system
- Real-time notification bell
- Notification types: NEW_OFFER, OFFER_ACCEPTED, OFFER_REJECTED, NEW_MESSAGE, TASK_COMPLETED
- Email notifications via Brevo (password reset, task events, offer events)
- SMS via Brevo (verification codes, task/offer notifications)
- Web push notifications (VAPID, browser-native)

#### Verification & Security
- OTP-based phone/email verification (`VerificationCode` model, `/api/auth/verify-send` + `/api/auth/verify-check`)
- Audit trail for admin actions (`ActionLog` model, `/api/admin/action-logs`)
- Environment variable validation at startup (`lib/env-validation.ts`)

#### Admin Panel
- Dashboard with platform statistics
- User management
- Task management and moderation
- Category management
- Subscription management
- System settings

## 🛠️ Tech Stack

- **Framework**: Next.js 16.1.4 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19.2.3
- **Database**: PostgreSQL (Supabase, Prisma ORM)
- **Hosting**: Vercel
- **Authentication**: JWT (jose library)
- **Password Hashing**: bcryptjs
- **SMS**: Brevo
- **Icons**: Lucide React
- **Styling**: CSS Modules + Inline Styles

## 📋 Prerequisites

- Node.js 24.x or higher
- npm, yarn, pnpm, or bun
- Git

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/MaNami192/Dastiyor.git
cd Dastiyor
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory. **This project uses Supabase (Postgres) only** — there is no separate local database; dev and deploy both use the same Supabase project.

```env
# Required
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
NODE_ENV="development"

# Database (Supabase Postgres)
DATABASE_URL="postgresql://..."
POSTGRES_PRISMA_URL="postgresql://..."
POSTGRES_URL_NON_POOLING="postgresql://..."

# Optional: Email + SMS (Brevo)
BREVO_API_KEY="xkeysib-..."
BREVO_FROM_EMAIL="noreply@yourdomain.com"   # Must be a verified sender in Brevo
BREVO_FROM_NAME="Dastiyor"
BREVO_SMS_SENDER="Dastiyor"

# Optional: Payment gateway (SmartPay TJ)
SMARTPAY_API_URL="https://api.smartpay.tj"
SMARTPAY_MERCHANT_ID="your-merchant-id"
SMARTPAY_SECRET_KEY="your-secret-key"

# Optional: Web push notifications (VAPID)
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_SUBJECT="mailto:admin@dastiyor.com"

# Optional: Supabase client
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

**Important**: Use a strong `JWT_SECRET` and never commit real keys.

### 4. Set Up Database (Supabase)

Migrations and seed run against the Supabase database in your `.env`:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (against Supabase)
npx prisma migrate deploy

# Seed sample data (users + tasks so /tasks feed is not empty)
npx prisma db seed

# (Optional) Open Prisma Studio to view/edit data
npx prisma studio
```

### 5. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
dastiyor/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── tasks/           # Task management
│   │   ├── responses/       # Response management
│   │   ├── messages/        # Chat/messaging
│   │   ├── reviews/         # Reviews & ratings
│   │   ├── subscription/    # Subscription management
│   │   └── notifications/   # Notifications
│   ├── admin/               # Admin panel pages
│   ├── create-task/         # Task creation page
│   ├── tasks/               # Task listing & details
│   ├── profile/             # User profile pages
│   ├── subscription/        # Subscription pages
│   └── ...                  # Other pages
├── components/               # React components
│   ├── auth/               # Authentication components
│   ├── chat/               # Chat interface
│   ├── create-task/        # Task creation steps
│   ├── landing/            # Landing page components
│   ├── reviews/            # Review components
│   ├── subscription/       # Subscription components
│   └── tasks/              # Task-related components
├── lib/                     # Utility libraries
│   ├── auth.ts             # JWT authentication
│   ├── prisma.ts           # Prisma client
│   ├── brevo-sms.ts        # Brevo SMS client
│   ├── rate-limit.ts       # Rate limiting
│   ├── validation.ts       # Input validation
│   ├── notifications/      # Email & SMS services
│   └── payments/           # Payment integration
├── prisma/                  # Database
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
└── public/                  # Static assets
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/verify-send` - Send OTP verification code
- `POST /api/auth/verify-check` - Verify OTP code

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/[id]` - Get task details
- `PUT /api/tasks/[id]` - Update task
- `GET /api/tasks/[id]/history` - Task change history
- `POST /api/tasks/accept` - Accept a provider for a task
- `POST /api/tasks/complete` - Mark task as completed
- `POST /api/tasks/cancel` - Cancel a task
- `POST /api/tasks/favorite` - Toggle task favorite
- `GET /api/tasks/search` - Search tasks

### Responses
- `POST /api/responses` - Submit a response to a task
- `POST /api/responses/reject` - Reject a response

### Messages & Conversations
- `GET /api/messages?userId=...&taskId=...` - Get messages
- `POST /api/messages` - Send a message
- `GET /api/conversations` - Get all conversations grouped by partner

### Reviews
- `GET /api/reviews?userId=...` - Get reviews for a user
- `POST /api/reviews` - Create a review

### Subscriptions & Payments
- `GET /api/subscription` - Get current subscription
- `POST /api/subscription` - Create/update subscription
- `DELETE /api/subscription` - Cancel subscription
- `GET /api/payments/status` - SmartPay payment status check
- `POST /api/webhooks/smartpay` - SmartPay payment webhook

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications` - Mark all as read

### Web Push
- `GET /api/push/vapid-key` - Get VAPID public key
- `PUT /api/push/subscribe` - Register push subscription
- `DELETE /api/push/subscribe` - Remove push subscription

### Upload
- `POST /api/upload` - Upload images (max 5MB)

### Admin (requires admin JWT)
- `GET /api/admin/action-logs` - Audit trail of admin actions
- `POST /api/admin/bulk` - Bulk operations (users, tasks, etc.)
- `POST /api/admin/test-email` - Send test email
- `POST /api/admin/test-sms` - Send test SMS (phone + message body)

### Provider
- `POST /api/provider/verify` - Provider verification request

## 🗄️ Database Schema

### Main Models
- **User**: Customers, Providers, Admins
- **Task**: Service tasks posted by customers
- **Response**: Provider offers/responses to tasks
- **Subscription**: Provider subscription plans
- **Payment**: Payment records for subscriptions
- **Message**: Chat messages between users
- **Review**: Ratings and reviews
- **Notification**: In-app notifications
- **PasswordReset**: Password reset tokens
- **VerificationCode**: OTP codes for phone/email verification
- **TaskFavorite**: Customer-saved/bookmarked tasks
- **ActionLog**: Audit trail for admin actions
- **PushSubscription**: Browser web push subscriptions

See `prisma/schema.prisma` for complete schema definition.

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Postgres connection string (Supabase or other) | Yes |
| `POSTGRES_PRISMA_URL` | Postgres URL for Prisma (pooler when using Supabase) | Yes |
| `POSTGRES_URL_NON_POOLING` | Direct Postgres URL (migrations, etc.) | Yes |
| `JWT_SECRET` | Secret key for JWT token signing | Yes |
| `NODE_ENV` | Environment (development/production) | No (defaults) |

### Optional
| Variable | Description |
|----------|-------------|
| `BREVO_API_KEY` | Brevo API key for email/SMS |
| `BREVO_FROM_EMAIL` | Verified sender email (Brevo) |
| `BREVO_FROM_NAME` | Sender display name (default "Dastiyor") |
| `BREVO_SMS_SENDER` | SMS sender ID (default "Dastiyor") |
| `SMARTPAY_API_URL` | SmartPay TJ API base URL |
| `SMARTPAY_MERCHANT_ID` | SmartPay merchant ID |
| `SMARTPAY_SECRET_KEY` | SmartPay secret key |
| `VAPID_PRIVATE_KEY` | VAPID private key for web push |
| `VAPID_SUBJECT` | VAPID subject (mailto: or URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

## 🚢 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Database Migration in Production

```bash
npx prisma migrate deploy
npx prisma generate
```

### Recommended Platforms
- **Vercel** (recommended; set Node.js version to 24.x in Project Settings)
- **Netlify**
- **Railway**
- **DigitalOcean App Platform**
- **AWS Amplify**

### Production Checklist
- [ ] Set strong `JWT_SECRET`
- [ ] Set `DATABASE_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` for Supabase DB
- [ ] Set `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME` for email notifications
- [ ] Set `BREVO_SMS_SENDER` for custom SMS sender ID
- [ ] Set `SMARTPAY_API_URL`, `SMARTPAY_MERCHANT_ID`, `SMARTPAY_SECRET_KEY` for payments
- [ ] Set `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` for web push notifications
- [ ] Configure cloud storage for uploads (S3/DigitalOcean Spaces)
- [ ] Enable HTTPS
- [ ] Set up monitoring and logging

### QA / Deployment verification

We use **Supabase only** (no local DB). When testing:

- **Empty task list on `/tasks`**  
  The feed reads from Supabase. If there are no tasks, the page shows **sample task cards** and a hint. To add real tasks, run once:
  ```bash
  npx prisma db seed
  ```
  This seeds the Supabase database in your `.env`.

- **“Load more” (lazy loading)**  
  The feed shows 6 tasks per page. The **“Загрузить ещё”** button appears when there are more than 6 tasks (e.g. after running the seed, which adds 7 tasks).

- **Password validation**  
  Registration and reset password require at least 8 characters, one uppercase, one lowercase, and one number. Weak or short passwords are rejected on both client and server.

## 🔧 Development

### Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm test              # Run Jest unit/integration tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npx playwright test   # Run E2E tests (Chrome, Firefox, Safari)
```

### Database Commands

```bash
npx prisma generate          # Generate Prisma Client
npx prisma migrate dev       # Create and apply migration
npx prisma migrate deploy    # Apply migrations in production
npx prisma studio            # Open database GUI
npx prisma db push           # Push schema changes (dev only)
```

## 📝 Features Implementation Status

✅ **Completed**
- User authentication and authorization
- OTP-based phone/email verification
- Task creation and management (with history tracking)
- Response system with subscription validation
- Chat/messaging with conversation grouping
- Reviews and ratings
- Subscription system (Basic, Standard, Premium)
- Payment gateway (SmartPay TJ) with webhook
- Admin panel (users, tasks, categories, subscriptions, moderation, settings)
- Audit trail for admin actions
- In-app notification system
- Email notifications (Brevo)
- SMS notifications (Brevo)
- Web push notifications (VAPID)
- File uploads
- Rate limiting
- Priority placement for Premium plans
- Task favorites/bookmarks
- Advanced filtering & sorting
- Subcategory support
- Sidebar navigation for Customer & Provider
- Estimated completion time
- Environment variable validation at startup

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 👥 Authors

- **Development Team** - Initial work

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Prisma for the excellent ORM
- All open-source contributors

## 📞 Support

For support, please open an issue in the GitHub repository.

---

**Built with ❤️ for the Dastiyor marketplace platform**
