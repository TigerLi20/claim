import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [pendingEmail, setPendingEmail] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("claimco_user");
    const token = localStorage.getItem("claimco_token");
    const pending = sessionStorage.getItem("claimco_pending_user_id");
    const pendingEmail_ = sessionStorage.getItem("claimco_pending_email");

    if (pending) {
      setPendingUserId(pending);
      setPendingEmail(pendingEmail_);
      setReady(true);
      return;
    }

    if (stored && token) {
      setUser(JSON.parse(stored));
      api.getMe()
        .then((data) => persist(token, data.user))
        .catch(() => { })
        .finally(() => setReady(true));
      return;
    }
    setReady(true);
  }, []);

  function persist(token, user) {
    localStorage.setItem("claimco_token", token);
    localStorage.setItem("claimco_user", JSON.stringify(user));
    sessionStorage.removeItem("claimco_pending_user_id");
    sessionStorage.removeItem("claimco_pending_email");
    setPendingUserId(null);
    setPendingEmail(null);
    setUser(user);
  }

  async function clearPending() {
    const pendingId = sessionStorage.getItem("claimco_pending_user_id");
    if (pendingId) {
      try {
        // Delete the pending user from backend with keepalive so request completes even if page unloads
        await fetch(`${api.API_BASE || 'http://localhost:3001'}/auth/cancel-registration`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pendingUserId: pendingId }),
          keepalive: true
        });
      } catch (err) {
        console.error("Error cancelling registration:", err);
        // Continue anyway to clear frontend state
      }
    }
    sessionStorage.removeItem("claimco_pending_user_id");
    sessionStorage.removeItem("claimco_pending_email");
    setPendingUserId(null);
    setPendingEmail(null);
  }

  async function register(payload) {
    const data = await api.register(payload);
    // New flow: register returns pendingUserId, not token
    sessionStorage.setItem("claimco_pending_user_id", data.pendingUserId);
    sessionStorage.setItem("claimco_pending_email", data.email);
    setPendingUserId(data.pendingUserId);
    setPendingEmail(data.email);
    return data;
  }

  async function verifyEmail(pendingUserId, code) {
    const data = await api.verifyEmail({ pendingUserId, code });
    persist(data.token, data.user);
    return data.user;
  }

  async function resendCode(pendingUserId) {
    const data = await api.resendCode({ pendingUserId });
    return data;
  }

  async function requestLoginCode(email) {
    const data = await api.requestLoginCode({ email });
    return data;
  }

  async function login(payload) {
    const data = await api.login(payload);
    persist(data.token, data.user);
    return data.user;
  }

  async function updateProfile(payload) {
    const data = await api.updateProfile(payload);
    localStorage.setItem("claimco_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("claimco_token");
    localStorage.removeItem("claimco_user");
    sessionStorage.removeItem("claimco_pending_onboarding");
    sessionStorage.removeItem("claimco_onboarding_choice");
    sessionStorage.removeItem("claimco_show_welcome");
    sessionStorage.removeItem("claimco_pending_user_id");
    sessionStorage.removeItem("claimco_pending_email");
    sessionStorage.removeItem("claim_admin_key");
    setPendingUserId(null);
    setPendingEmail(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, ready, pendingUserId, pendingEmail, register, verifyEmail, resendCode, requestLoginCode, login, updateProfile, logout, clearPending }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
