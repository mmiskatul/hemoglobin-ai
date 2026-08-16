const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";

export interface DonorPayload {
  name: string;
  email: string;
  phone: string;
  blood_group: string;
  location: string;
  is_available: boolean;
}

export interface DonorResponse {
  id: number;
  name: string;
  email: string;
  phone: string;
  blood_group: string;
  location: string;
  is_available: boolean;
  registered_at: string;
}

export interface AIChatResponse {
  reply: string;
  matching_count: number;
  notifications_sent: number;
  donors: DonorResponse[];
  rag_context_used?: boolean;
}

export interface NotificationLog {
  id: number;
  donor_name: string;
  donor_email: string;
  blood_group: string;
  location: string;
  message_content?: string;
  status: string;
  sent_at: string;
}

export interface AuditStats {
  total_dispatched: number;
  delivered_count: number;
  simulated_count: number;
  failed_count: number;
  success_rate: number;
  top_blood_group: string;
}

export interface LogQueryParams {
  search?: string;
  blood_group?: string;
  status?: string;
  location?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  blood_group: string;
  location: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  is_available?: boolean;
  is_verified?: boolean;
}

export interface SocialPost {
  id: number;
  user_id: number;
  author_name: string;
  blood_group: string;
  location: string;
  urgency: string;
  content: string;
  ai_analysis: string;
  matched_donor_count: number;
  likes_count?: number;
  liked_by?: number[];
  created_at: string;
}

export interface DirectMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  receiver_id: number;
  receiver_name: string;
  message: string;
  sent_at: string;
}

export interface Conversation {
  id: number;
  name: string;
  last_message: string;
  last_sent_at: string;
}

export interface OverviewStats {
  total_donors: number;
  available_donors: number;
  total_dispatched: number;
  success_rate: number;
  top_blood_group: string;
  last_activity?: string;
}

export interface AIChatHistoryItem {
  id?: string;
  user_id: number;
  message: string;
  reply: string;
  matching_count?: number;
  donors?: DonorResponse[];
  created_at: string;
}

export const api = {
  checkHealth: async (): Promise<boolean> => {
    try {
      const backendHost = BASE_URL.replace(/\/api\/?$/, "");
      const res = await fetch(`${backendHost}/health`, { cache: "no-store" });
      return res.ok;
    } catch {
      return false;
    }
  },

  registerUser: async (payload: Record<string, unknown>): Promise<{ message: string; user?: User; requires_verification?: boolean; email?: string; otp_demo?: string }> => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || "Registration failed");
    }
    return response.json();
  },

  verifyOTP: async (payload: { email: string; otp: string }): Promise<{ message: string; user: User; token: string }> => {
    const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || "OTP verification failed");
    }
    return response.json();
  },

  resendOTP: async (email: string): Promise<{ message: string; otp_demo?: string }> => {
    const response = await fetch(`${BASE_URL}/auth/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || "Failed to resend OTP");
    }
    return response.json();
  },

  forgotPassword: async (email: string): Promise<{ message: string; email: string; otp_demo: string }> => {
    const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || "Failed to send reset code");
    }
    return response.json();
  },

  resetPassword: async (payload: { email: string; otp: string; new_password: string }): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || "Failed to reset password");
    }
    return response.json();
  },

  getUserProfileDetail: async (userId: number): Promise<User> => {
    const response = await fetch(`${BASE_URL}/users/profile/${userId}`, {
      cache: "no-store"
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || "Failed to fetch user profile");
    }
    return response.json();
  },

  updateUserProfileDetail: async (userId: number, payload: Partial<User>): Promise<User> => {
    const response = await fetch(`${BASE_URL}/users/profile/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || "Failed to update profile");
    }
    return response.json();
  },

  uploadAvatar: async (file: File): Promise<{ url: string; provider: string; message: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${BASE_URL}/upload/avatar`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || "Failed to upload avatar image");
    }
    return response.json();
  },

  loginUser: async (payload: Record<string, unknown>): Promise<{ message: string; token: string; user: User }> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Login failed");
    }
    return res.json();
  },

  getPosts: async (bloodGroup?: string, location?: string): Promise<{ posts: SocialPost[]; total: number }> => {
    let url = `${BASE_URL}/posts?`;
    if (bloodGroup && bloodGroup !== "ALL") url += `blood_group=${encodeURIComponent(bloodGroup)}&`;
    if (location) url += `location=${encodeURIComponent(location)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch social posts");
    return res.json();
  },

  createPost: async (payload: Record<string, unknown>): Promise<{ message: string; post: SocialPost; matched_donors: number }> => {
    const res = await fetch(`${BASE_URL}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to create post");
    }
    return res.json();
  },

  likePost: async (postId: number, userId?: number): Promise<{ message: string; likes_count: number; has_liked: boolean }> => {
    const res = await fetch(`${BASE_URL}/posts/${postId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId || 0 }),
    });
    if (!res.ok) throw new Error("Failed to update post like");
    return res.json();
  },

  pledgePost: async (postId: number, payload: Record<string, unknown>): Promise<{ message: string }> => {
    const res = await fetch(`${BASE_URL}/posts/${postId}/pledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to pledge donation");
    return res.json();
  },

  getConversations: async (userId: number): Promise<{ conversations: Conversation[] }> => {
    const res = await fetch(`${BASE_URL}/messages/conversations/${userId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch conversations");
    return res.json();
  },

  getChatHistory: async (senderId: number, receiverId: number): Promise<{ messages: DirectMessage[] }> => {
    const res = await fetch(`${BASE_URL}/messages/${senderId}/${receiverId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch message history");
    return res.json();
  },

  sendDirectMessage: async (payload: Record<string, unknown>): Promise<{ message: string; data: DirectMessage }> => {
    const res = await fetch(`${BASE_URL}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  },

  registerDonor: async (payload: DonorPayload): Promise<{ message: string; donor: DonorResponse }> => {
    const response = await fetch(`${BASE_URL}/donors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || "Failed to register donor");
    }
    return response.json();
  },

  listDonors: async (bloodGroup?: string, location?: string): Promise<{ donors: DonorResponse[]; total: number }> => {
    let url = `${BASE_URL}/donors?`;
    if (bloodGroup && bloodGroup !== "ALL") {
      url += `blood_group=${encodeURIComponent(bloodGroup)}&`;
    }
    if (location) {
      url += `location=${encodeURIComponent(location)}`;
    }
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch donor registry");
    return response.json();
  },

  toggleDonorAvailability: async (donorId: number): Promise<{ message: string; donor: DonorResponse }> => {
    const response = await fetch(`${BASE_URL}/donors/${donorId}/toggle-availability`, { method: "PATCH" });
    if (!response.ok) throw new Error("Failed to toggle donor availability");
    return response.json();
  },

  deleteDonor: async (donorId: number): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/donors/${donorId}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete donor");
    return response.json();
  },

  getOverviewStats: async (): Promise<OverviewStats> => {
    const response = await fetch(`${BASE_URL}/stats/overview`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch overview stats");
    return response.json();
  },

  sendAIChat: async (message: string, userId?: number): Promise<AIChatResponse> => {
    const response = await fetch(`${BASE_URL}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, user_id: userId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || "AI Assistant request failed");
    }
    return response.json();
  },

  getAIChatHistory: async (userId: number): Promise<{ history: AIChatHistoryItem[] }> => {
    const response = await fetch(`${BASE_URL}/ai/chat/history/${userId}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch AI chat history");
    return response.json();
  },

  getNotificationLogs: async (params?: LogQueryParams): Promise<{ logs: NotificationLog[]; total: number }> => {
    let url = `${BASE_URL}/logs?`;
    if (params?.search) url += `search=${encodeURIComponent(params.search)}&`;
    if (params?.blood_group && params.blood_group !== "ALL") url += `blood_group=${encodeURIComponent(params.blood_group)}&`;
    if (params?.status && params.status !== "ALL") url += `status=${encodeURIComponent(params.status)}&`;
    if (params?.location) url += `location=${encodeURIComponent(params.location)}&`;

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch notification logs");
    return response.json();
  },

  getLogStats: async (): Promise<AuditStats> => {
    const response = await fetch(`${BASE_URL}/logs/stats`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch audit stats");
    return response.json();
  },

  getLogById: async (logId: number): Promise<{ log: NotificationLog }> => {
    const response = await fetch(`${BASE_URL}/logs/${logId}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch log detail");
    return response.json();
  },

  resendLog: async (logId: number): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/logs/resend/${logId}`, { method: "POST" });
    if (!response.ok) throw new Error("Failed to re-dispatch notification");
    return response.json();
  },

  deleteLog: async (logId: number): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/logs/${logId}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete log entry");
    return response.json();
  },

  clearLogs: async (): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/logs/clear`, { method: "POST" });
    if (!response.ok) throw new Error("Failed to clear audit logs");
    return response.json();
  },

  triggerTestLog: async (): Promise<{ message: string; log: NotificationLog }> => {
    const response = await fetch(`${BASE_URL}/logs/test-trigger`, { method: "POST" });
    if (!response.ok) throw new Error("Failed to trigger test audit log");
    return response.json();
  },
};
