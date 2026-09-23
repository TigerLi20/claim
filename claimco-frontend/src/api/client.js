export const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");
async function request(path, { method = "GET", body, auth = true, cache } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("claimco_token");
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache });
  const data = await response.json().catch(() => ({}));
  if (auth && response.status === 401) {
    localStorage.removeItem("claimco_token");
    localStorage.removeItem("claimco_user");
    window.dispatchEvent(new Event("claimco-auth-expired"));
  }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
export const api = {
  register: payload => request("/auth/register", { method: "POST", body: payload, auth: false }),
  verifyEmail: payload => request("/auth/verify-email", { method: "POST", body: payload, auth: false }),
  resendCode: payload => request("/auth/resend-code", { method: "POST", body: payload, auth: false }),
  requestLoginCode: payload => request("/auth/request-login-code", { method: "POST", body: payload, auth: false }),
  cancelRegistration: pendingUserId => request("/auth/cancel-registration", { method: "POST", body: { pendingUserId }, auth: false }),
  login: payload => request("/auth/login", { method: "POST", body: payload, auth: false }),
  getMe: () => request("/auth/me"),
  updateProfile: payload => request("/auth/profile", { method: "PATCH", body: payload }),
  listItems: ({ category = "", search = "" } = {}) => request(`/items?${new URLSearchParams({ category, search })}`, { auth: false, cache: "no-store" }),
  myListings: () => request("/items/mine/listings"),
  myInquiries: () => request("/items/mine/inquiries"),
  getItem: id => request(`/items/${id}`, { auth: false }),
  postItem: payload => request("/items", { method: "POST", body: payload }),
  updateItem: (id, payload) => request(`/items/${id}`, { method: "PATCH", body: payload }),
  deleteItem: id => request(`/items/${id}`, { method: "DELETE" }),
  setItemStatus: (id, status) => request(`/items/${id}/status`, { method: "PATCH", body: { status } }),
  interest: id => request(`/items/${id}/interest`, { method: "POST" }),
  conversations: () => request("/conversations"),
  conversationMessages: id => request(`/conversations/${id}/messages`),
  markConversationRead: id => request(`/conversations/${id}/read`, { method: "POST" }),
  getUserProfile: id => request(`/users/${id}`, { auth: false }),
};
