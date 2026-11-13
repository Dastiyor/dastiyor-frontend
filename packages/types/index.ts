export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// COMPLETED is set when the customer finishes the task, so the provider's
// own list stops reading 'Accepted' for a job that is already done.
export type ResponseStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';

export interface ApiUser {
  id: string;
  email?: string | null;
  fullName: string;
  role: UserRole;
  phone?: string | null;
  avatar?: string | null;
  createdAt: string;
  /** Google/Apple account with no verified phone yet: send to verify-phone before anything else. */
  phoneVerificationRequired?: boolean;
}

export interface ApiTask {
  id: string;
  title: string;
  description: string;
  category: string;
  budget?: number | null;
  city?: string | null;
  status: TaskStatus;
  createdAt: string;
  customer: Pick<ApiUser, 'id' | 'fullName' | 'avatar'>;
}

export interface ApiResponse {
  id: string;
  message: string;
  price?: number | null;
  status: ResponseStatus;
  createdAt: string;
  provider: Pick<ApiUser, 'id' | 'fullName' | 'avatar'>;
}

export interface FeedTask {
  id: string;
  title: string;
  category: string;
  budget: string;
  city: string;
  postedAt: string;
  description: string;
  urgency: string;
  responseCount: number;
  status: string;
  /** Editorially promoted. Clients surface these first and cap the strip at 3. */
  featured: boolean;
}

export interface TaskDetail extends FeedTask {
  address?: string | null;
  images: string[];
  dueDate?: string | null;
  hasReview: boolean;
  customer: Pick<ApiUser, 'id' | 'fullName' | 'avatar'>;
}

/** A provider's past job, from /api/profile/portfolio and the public profile. */
export interface PortfolioProject {
  id: string;
  title: string;
  description: string | null;
  images: string[];
  order: number;
}

/** Paid provider plans (FREE is the absence of one). See apps/web/lib/plans.ts. */
export type SubscriptionTier = 'pro' | 'pro_plus' | 'business';

export type ProfessionalSort = 'rating' | 'reviews' | 'completed' | 'newest';

/** A provider in /api/professionals search results. */
export interface ProfessionalCard {
  id: string;
  fullName: string;
  avatar: string | null;
  city: string | null;
  categories: string[];
  experienceYears: number | null;
  isVerified: boolean;
  avgRating: number | null;
  reviewCount: number;
  completedCount: number;
  /** null while subscriptions are switched off */
  tier: SubscriptionTier | null;
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: { id: string; fullName: string };
  task: { id: string; title: string; category: string };
}

/** GET /api/users/[id] → { user: PublicProfile } */
export interface PublicProfile {
  id: string;
  fullName: string;
  avatar: string | null;
  bio: string | null;
  skills: string | null;
  role: UserRole;
  createdAt: string;
  experienceYears: number | null;
  city: string | null;
  categories: string[];
  isVerified: boolean;
  completedCount: number;
  /** 0 when there are no reviews */
  avgRating: number;
  reviewCount: number;
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  reviews: PublicReview[];
  portfolio: PortfolioProject[];
  tier: SubscriptionTier | null;
}

export type SourcingStatus = 'NEW' | 'IN_PROGRESS' | 'PROPOSED' | 'CLOSED';

/** A company's request for the team to find professionals (GET /api/sourcing). */
export interface SourcingRequest {
  id: string;
  category: string;
  city: string;
  headcount: number;
  experienceYears: number | null;
  budget: string | null;
  deadline: string | null;
  description: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  status: SourcingStatus;
  createdAt: string;
  proposed: { id: string; fullName: string }[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Conversation {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerRole?: string | null;
  partnerAvatar?: string | null;
  taskId: string | null;
  taskTitle: string | null;
  taskCategory?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  imageUrl: string | null;
  senderId: string;
  receiverId: string;
  taskId: string | null;
  isRead: boolean;
  createdAt: string;
  sender: { id: string; fullName: string };
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  taskId?: string | null;
  partnerId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface TaskResponse {
  id: string;
  message: string;
  price: string;
  estimatedTime: string | null;
  status: string;
  createdAt: string;
  provider: Pick<ApiUser, 'id' | 'fullName' | 'avatar'>;
}

export interface MyResponse {
  id: string;
  message: string;
  price: string;
  estimatedTime: string | null;
  status: ResponseStatus;
  createdAt: string;
}

export interface ApiError {
  error: string;
  code?: string;
}

// --- Provider analytics (GET /api/provider/analytics) ---

/** Where a profile view came from. */
export type ProfileViewSource = 'directory' | 'task' | 'search' | 'direct';

/** A provider's plan as analytics sees it: FREE or an active, unexpired paid plan. */
export type AnalyticsPlan = 'free' | SubscriptionTier;

/** Sections of the analytics screen, each unlocked by a plan. */
export type AnalyticsSection = 'profile' | 'advanced' | 'responses';

/** A canonical Russian category or city with a count; translate `name` for display only. */
export interface AnalyticsNamedCount {
  name: string;
  views: number;
}

/** "Расширенная аналитика профиля" — PRO+ and BUSINESS. */
export interface ProfileAnalytics {
  views7: number;
  views30: number;
  /** One entry per day for the last 30 days, oldest first, dates in Dushanbe time (YYYY-MM-DD). */
  daily: { date: string; views: number }[];
  /** Views in the last 30 days by source. */
  sources: Record<ProfileViewSource, number>;
  /** All responses ever sent, how many were hired, and the rate (0–100, null with no responses). */
  responses: number;
  hired: number;
  conversion: number | null;
}

/** Last-30-day figures used in the peer comparison. */
export interface AnalyticsComparisonFigures {
  views30: number;
  responses30: number;
  /** Hired share of the responses sent in the last 30 days, 0–100; null with none sent. */
  conversion30: number | null;
}

/** "Продвинутая аналитика профиля" — BUSINESS. */
export interface AdvancedProfileAnalytics {
  you: AnalyticsComparisonFigures;
  /** Average of providers sharing at least one category; null when you have no categories or no peers. */
  peers: (AnalyticsComparisonFigures & { count: number }) | null;
  /** Views in the last 30 days by the category/city of the page they came from, most first. */
  byCategory: AnalyticsNamedCount[];
  byCity: AnalyticsNamedCount[];
}

/** "Расширенная статистика откликов" — BUSINESS. */
export interface ResponseAnalytics {
  sent: number;
  /** Customers' views of a response are not tracked yet: always null. */
  viewed: number | null;
  hired: number;
  conversion: number | null;
  byCategory: { name: string; sent: number; hired: number; conversion: number | null }[];
  /** Mean minutes from a task being posted to your response; null with no responses. */
  avgResponseMinutes: number | null;
  /** Last 6 months, oldest first, months in Dushanbe time (YYYY-MM). */
  monthly: { month: string; sent: number; hired: number }[];
}

/**
 * GET /api/provider/analytics. A section the caller's plan does not include is
 * null and listed in `locked`, with the cheapest plan that unlocks it.
 */
export interface ProviderAnalytics {
  plan: AnalyticsPlan;
  /** Profile views are counted from this day (YYYY-MM-DD); nothing earlier exists. */
  viewsTrackedSince: string;
  profile: ProfileAnalytics | null;
  advanced: AdvancedProfileAnalytics | null;
  responses: ResponseAnalytics | null;
  locked: { section: AnalyticsSection; plan: SubscriptionTier }[];
}
