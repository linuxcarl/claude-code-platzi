const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function clearToken() {
  localStorage.removeItem("access_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, false);
    clearToken();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("auth:logout"));
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.detail || body?.error?.message || "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json();
    setToken(data.access_token);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Auth
export const auth = {
  register: (data: { email: string; password: string; full_name: string }) =>
    request<{ access_token: string; token_type: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  changePassword: (data: { current_password: string; new_password: string }) =>
    request<void>("/auth/change-password", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// Users
export const users = {
  me: () => request<import("./types").User>("/users/me"),
  updateMe: (data: { full_name: string }) =>
    request<import("./types").User>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// Videos
export const videos = {
  list: (params: import("./types").VideoListParams = {}) => {
    const q = new URLSearchParams();
    if (params.category_slug) q.set("category_slug", params.category_slug);
    if (params.tag_slug) q.set("tag_slug", params.tag_slug);
    if (params.search) q.set("search", params.search);
    if (params.is_free !== undefined) q.set("is_free", String(params.is_free));
    if (params.sort) q.set("sort", params.sort);
    if (params.page) q.set("page", String(params.page));
    if (params.page_size) q.set("page_size", String(params.page_size));
    return request<import("./types").PaginatedResponse<import("./types").VideoListItem>>(
      `/videos?${q}`
    );
  },
  get: (slug: string) => request<import("./types").VideoDetail>(`/videos/${slug}`),
};

// Categories — backend returns { items, total, ... }
export const categories = {
  list: (includeCount = false) =>
    request<import("./types").PaginatedResponse<import("./types").Category>>(
      `/categories${includeCount ? "?include_count=true" : ""}`
    ).then((r) => r.items),
  get: (slug: string) =>
    request<import("./types").Category>(`/categories/${slug}`),
};

// Tags — backend returns { items, total, ... }
export const tags = {
  list: () =>
    request<import("./types").PaginatedResponse<import("./types").Tag>>("/tags").then(
      (r) => r.items
    ),
};

// Progress — backend uses watched_seconds / total_seconds
export const progress = {
  update: (data: { video_id: string; watched_seconds: number; total_seconds: number }) =>
    request<import("./types").WatchProgress>("/progress", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  list: () =>
    request<import("./types").PaginatedResponse<import("./types").ProgressWithVideo>>("/progress")
      .then((r) => r.items),
  get: (videoId: string) =>
    request<import("./types").WatchProgress>(`/progress/${videoId}`),
};

// Favorites — backend returns { items, total, offset, limit }
export const favorites = {
  add: (videoId: string) =>
    request<{ id: string; video_id: string; created_at: string }>("/favorites", {
      method: "POST",
      body: JSON.stringify({ video_id: videoId }),
    }),
  remove: (videoId: string) =>
    request<void>(`/favorites/${videoId}`, { method: "DELETE" }),
  list: () =>
    request<import("./types").PaginatedResponse<import("./types").FavoriteWithVideo>>("/favorites")
      .then((r) => r.items),
};

// Subscriptions — backend uses billing_cycle, not billing_period
export const subscriptions = {
  plans: () => request<import("./types").SubscriptionPlan[]>("/plans"),
  current: () =>
    request<import("./types").Subscription | null>("/subscriptions/current"),
  subscribe: (data: { plan_id: string; billing_cycle: "monthly" | "annual" }) =>
    request<import("./types").Subscription>("/subscriptions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  cancel: () => request<import("./types").Subscription>("/subscriptions/cancel", { method: "POST" }),
  paymentHistory: () =>
    request<import("./types").PaginatedResponse<import("./types").Payment>>("/payments/history")
      .then((r) => r.items),
};

// Admin
export const admin = {
  videos: {
    list: (params: { page?: number; page_size?: number; status?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.page) q.set("page", String(params.page));
      if (params.page_size) q.set("page_size", String(params.page_size));
      if (params.status) q.set("status", params.status);
      return request<import("./types").PaginatedResponse<import("./types").VideoListItem>>(
        `/admin/videos?${q}`
      );
    },
    create: (data: import("./types").AdminVideoCreate) =>
      request<import("./types").VideoListItem>("/admin/videos", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: import("./types").AdminVideoUpdate) =>
      request<import("./types").VideoListItem>(`/admin/videos/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/admin/videos/${id}`, { method: "DELETE" }),
    publish: (id: string) =>
      request<import("./types").VideoListItem>(`/admin/videos/${id}/publish`, { method: "POST" }),
  },
  categories: {
    list: () =>
      request<import("./types").PaginatedResponse<import("./types").Category>>("/admin/categories")
        .then((r) => (Array.isArray(r) ? r : r.items)),
    create: (data: { name: string; description?: string }) =>
      request<import("./types").Category>("/admin/categories", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{ name: string; description: string; is_active: boolean }>) =>
      request<import("./types").Category>(`/admin/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/admin/categories/${id}`, { method: "DELETE" }),
  },
  users: {
    list: (params: { page?: number; page_size?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.page) q.set("page", String(params.page));
      if (params.page_size) q.set("page_size", String(params.page_size));
      return request<import("./types").PaginatedResponse<import("./types").User>>(
        `/admin/users?${q}`
      );
    },
    update: (id: string, data: Partial<{ role: string; is_active: boolean }>) =>
      request<import("./types").User>(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
};
