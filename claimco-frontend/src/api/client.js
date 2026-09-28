import { Capacitor } from "@capacitor/core";
import { clearToken, getToken } from "../auth/session";
export const API_BASE = (Capacitor.isNativePlatform() ? import.meta.env.VITE_MOBILE_API_BASE || "" : import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");
if (Capacitor.isNativePlatform() && (!API_BASE.startsWith("https://") || API_BASE.includes("localhost"))) throw new Error("Native builds require VITE_MOBILE_API_BASE with the production HTTPS API URL.");
async function request(path, { method = "GET", body, auth = true, cache } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache });
  const data = await response.json().catch(() => ({}));
  if (auth && response.status === 401) {
    await clearToken();
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
  trackItemView: () => request("/analytics/item-view", { method: "POST", auth: false }),
  startSearchSession: id => request("/analytics/search-sessions", { method: "POST", body: { id }, auth: false }),
  markSearchItemOpened: id => request(`/analytics/search-sessions/${id}/opened`, { method: "POST", auth: false }),
  analyticsSummary: () => request("/analytics/summary"),
  report: payload => request("/safety/reports", { method: "POST", body: payload }),
  blockUser: id => request(`/safety/blocks/${id}`, { method: "PUT" }),
  unblockUser: id => request(`/safety/blocks/${id}`, { method: "DELETE" }),
  listBlocks: () => request("/safety/blocks"),
  deleteAccount: () => request("/auth/me", { method: "DELETE" }),
  registerPushToken: (token, platform) => request("/devices/push-token", { method: "POST", body: { token, platform } }),
  removePushToken: token => request("/devices/push-token", { method: "DELETE", body: { token } }),
  reports: () => request("/safety/reports"),
  updateReport: (id, status) => request(`/safety/reports/${id}`, { method: "PATCH", body: { status } }),
};
