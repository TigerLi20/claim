// Change this if your backend runs somewhere other than localhost:3001.
export const API_BASE = "http://localhost:3001";

function getToken() {
  return localStorage.getItem("claimco_token");
}

async function request(path, { method = "GET", body, auth = true, cache } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  verifyEmail: (payload) => request("/auth/verify-email", { method: "POST", body: payload, auth: false }),
  resendCode: (payload) => request("/auth/resend-code", { method: "POST", body: payload, auth: false }),
  requestLoginCode: (payload) => request("/auth/request-login-code", { method: "POST", body: payload, auth: false }),
  cancelRegistration: (pendingUserId) => request("/auth/cancel-registration", { method: "POST", body: { pendingUserId }, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  getMe: () => request("/auth/me"),
  updateProfile: (payload) => request("/auth/profile", { method: "PATCH", body: payload }),

  listTasks: (status) => request(`/tasks${status ? `?status=${status}` : ""}`, { cache: "no-store" }),
  taskStats: () => request("/tasks/stats", { cache: "no-store" }),
  myTasks: () => request("/tasks/mine"),
  postTask: (payload) => request("/tasks", { method: "POST", body: payload }),
  claimTask: (id, anonymous = false, note = "") => request(`/tasks/${id}/claim`, { method: "POST", body: { anonymous, note } }),
  completeTask: async (id) => {
    const result = await request(`/tasks/${id}/complete`, { method: "POST" });
    if (result.status === "done") window.dispatchEvent(new Event("notifications-updated"));
    window.dispatchEvent(new Event("conversation-status-updated"));
    return result;
  },
  cancelTask: async (id) => {
    const result = await request(`/tasks/${id}/cancel`, { method: "POST" });
    window.dispatchEvent(new Event("notifications-updated"));
    return result;
  },
  getTask: (id) => request(`/tasks/${id}`),
  taskApplications: (id) => request(`/tasks/${id}/applications`),
  updateTask: (id, payload) => request(`/tasks/${id}`, { method: "PATCH", body: { ...payload, images: Array.isArray(payload.images) ? payload.images : [] } }),
  reofferTask: (id, payload) => request(`/tasks/${id}/reoffer`, { method: "POST", body: { ...payload, images: Array.isArray(payload.images) ? payload.images : [] } }),

  startOnboarding: () => request("/payments/connect/onboard", { method: "POST" }),
  markOnboarded: () => request("/payments/connect/mark-onboarded", { method: "POST" }),

  dashboardStats: () => request("/dashboard/stats"),

  listServices: () => request("/services", { cache: "no-store" }),
  myServices: () => request("/services/mine"),
  purchasedServices: () => request("/services/purchased"),
  serviceInstances: () => request("/services/instances"),
  getServiceInstance: (id) => request(`/services/instances/${id}`),
  completeServiceInstance: async (id) => {
    const result = await request(`/services/instances/${id}/complete`, { method: "POST" });
    if (result.fulfilled) window.dispatchEvent(new Event("notifications-updated"));
    window.dispatchEvent(new Event("conversation-status-updated"));
    return result;
  },
  postService: (payload) => request("/services", { method: "POST", body: payload }),
  deactivateService: async (id) => {
    const result = await request(`/services/${id}/deactivate`, { method: "POST" });
    window.dispatchEvent(new Event("notifications-updated"));
    return result;
  },
  activateService: (id) => request(`/services/${id}/activate`, { method: "POST" }),
  getService: (id) => request(`/services/${id}`),
  updateService: (id, payload) => request(`/services/${id}`, { method: "PATCH", body: { ...payload, images: Array.isArray(payload.images) ? payload.images : [] } }),
  reofferService: (id, payload) => request(`/services/${id}/reoffer`, { method: "POST", body: { ...payload, images: Array.isArray(payload.images) ? payload.images : [] } }),
  purchaseService: (id, note = "") => request(`/services/${id}/purchase`, { method: "POST", body: { note } }),
  notifications: () => request("/notifications"),
  conversations: () => request("/conversations"),
  conversationMessages: (id) => request(`/conversations/${id}/messages`),
  markConversationRead: (id) => request(`/conversations/${id}/read`, { method: "POST" }),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "POST" }),
  confirmTaskApplication: async (taskId, applicationId) => {
    const result = await request(`/tasks/${taskId}/applications/${applicationId}/confirm`, { method: "POST" });
    window.dispatchEvent(new Event("notifications-updated"));
    window.dispatchEvent(new Event("conversation-status-updated"));
    return result;
  },
  declineTaskApplication: async (taskId, applicationId) => {
    const result = await request(`/tasks/${taskId}/applications/${applicationId}/decline`, { method: "POST" });
    window.dispatchEvent(new Event("notifications-updated"));
    return result;
  },
  confirmServiceCustomer: async (serviceId, purchaseId) => {
    const result = await request(`/services/${serviceId}/customers/${purchaseId}/confirm`, { method: "POST" });
    window.dispatchEvent(new Event("notifications-updated"));
    window.dispatchEvent(new Event("conversation-status-updated"));
    return result;
  },
  declineServiceCustomer: async (serviceId, purchaseId) => {
    const result = await request(`/services/${serviceId}/customers/${purchaseId}/decline`, { method: "POST" });
    window.dispatchEvent(new Event("notifications-updated"));
    return result;
  },
  getUserProfile: (id) => request(`/users/${id}`),
  getReviewTarget: (kind, id) => request(`/reviews/${kind}/${id}`),
  submitReview: (kind, id, payload) => request(`/reviews/${kind}/${id}`, { method: "POST", body: payload }),
};
