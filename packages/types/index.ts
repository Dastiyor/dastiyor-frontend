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

export type SubscriptionTier = 'basic' | 'standard' | 'premium';

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
