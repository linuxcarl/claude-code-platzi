// Auth
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "user" | "admin";
  is_active: boolean;
  created_at: string;
}

// Categories
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  video_count?: number;
}

// Tags
export interface Tag {
  id: string;
  name: string;
  slug: string;
}

// Videos
export interface VideoListItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  is_free: boolean;
  status: "draft" | "published" | "archived";
  view_count: number;
  category: { id: string; name: string; slug: string } | null;
  tags: Tag[];
}

export interface UserProgressBrief {
  watched_seconds: number;
  total_seconds: number;
  is_completed: boolean;
  last_watched_at: string;
}

export interface VideoDetail extends VideoListItem {
  video_url: string | null;
  hls_url: string | null;
  user_progress: UserProgressBrief | null;
  is_favorited: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  page_size?: number;
  pages: number;
  offset?: number;
  limit?: number;
}

// Watch Progress
export interface WatchProgress {
  video_id: string;
  watched_seconds: number;
  total_seconds: number;
  is_completed: boolean;
  last_watched_at: string;
}

export interface ProgressWithVideo {
  video: VideoListItem;
  watched_seconds: number;
  total_seconds: number;
  is_completed: boolean;
  last_watched_at: string;
}

// Favorites
export interface FavoriteWithVideo {
  id: string;
  video: VideoListItem;
  created_at: string;
}

// Subscriptions
export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  currency: string;
  features: string[] | null;
}

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: string;
  billing_cycle: "monthly" | "annual";
  current_period_start: string;
  current_period_end: string;
  canceled_at: string | null;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

// Admin
export interface AdminVideoCreate {
  title: string;
  description?: string;
  video_url?: string;
  hls_url?: string;
  thumbnail_url?: string;
  is_free: boolean;
  category_id?: string;
}

export interface AdminVideoUpdate extends Partial<AdminVideoCreate> {
  status?: "draft" | "published" | "archived";
}

export interface VideoListParams {
  category_slug?: string;
  tag_slug?: string;
  search?: string;
  is_free?: boolean;
  sort?: "newest" | "oldest" | "popular";
  page?: number;
  page_size?: number;
}
