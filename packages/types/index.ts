export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type ResponseStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
  avatar?: string | null;
  createdAt: string;
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
}

export interface TaskDetail extends FeedTask {
  address?: string | null;
  images: string[];
  dueDate?: string | null;
  customer: Pick<ApiUser, 'id' | 'fullName' | 'avatar'>;
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
  taskId: string | null;
  taskTitle: string | null;
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

export interface ApiError {
  error: string;
  code?: string;
}
