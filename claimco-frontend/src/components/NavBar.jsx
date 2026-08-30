import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Tag, ListChecks, Wallet, BookOpenCheck, BookCheck, UserCircle, MessageCircle, Settings, LogOut, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import NotificationBell from "./NotificationBell";
import FulfillmentPopup from "./FulfillmentPopup";
import { BRAND } from "../brand";
import { api } from "../api/client";
import { socket } from "../chat/socket";

export default function NavBar() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = () => {
    setSettingsOpen(false);
    logout();
    navigate("/");
  };

  useEffect(() => {
    if (!user) return undefined;
    const loadUnread = () => api.conversations().then((items) => setUnreadMessages(items.reduce((total, item) => total + item.unreadCount, 0))).catch(() => { });
    socket.auth = { token: localStorage.getItem("claimco_token") };
    if (!socket.connected) socket.connect();
    loadUnread();
    const refresh = () => loadUnread();
    socket.on("new_message", refresh);
    window.addEventListener("conversation-read", refresh);
    const interval = window.setInterval(loadUnread, 3000);
    return () => {
      socket.off("new_message", refresh);
      window.removeEventListener("conversation-read", refresh);
      window.clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen]);

  return (
    <>
      {user && (
        <div className="header">
          <div className="brand">
            <span className="brand-mark">{BRAND.platform}</span>
            <span className="brand-tag">Help • Teach • Earn at Brown</span>
          </div>
          <div className="whoami">
            <NotificationBell />
            <NavLink className="account-link" to="/account">
              <UserCircle size={14} /> {user.name}
            </NavLink>
            <button className="settings-button" type="button" onClick={() => setSettingsOpen(true)}>
              <Settings size={14} /> Settings
            </button>
          </div>
        </div>
      )}

      {user && settingsOpen && (
        <div className="settings-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSettingsOpen(false);
        }}>
          <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="settings-dialog-header">
              <h2 id="settings-title">SETTINGS</h2>
              <button className="settings-close" type="button" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>
                <X size={17} />
              </button>
            </div>
            <div className="settings-option">
              <div className="settings-option-content">
                <label htmlFor="dark-mode-toggle">Dark Mode</label>
                <p className="settings-option-description">Switch to dark theme for comfortable viewing in low light</p>
              </div>
              <input
                id="dark-mode-toggle"
                type="checkbox"
                checked={isDarkMode}
                onChange={toggleDarkMode}
                className="dark-mode-toggle"
              />
            </div>
            <button
              type="button"
              className="settings-help-option"
              onClick={() => {
                setSettingsOpen(false);
                navigate("/help");
              }}
            >
              <span className="settings-help-row">
                <span>
                  <span className="settings-help-label">Help</span>
                  <span className="settings-option-description">Read our FAQ and get quick answers</span>
                </span>
              </span>
            </button>
            <button className="settings-logout" type="button" onClick={handleLogout}>
              <LogOut size={15} /> Log out
            </button>
          </section>
        </div>
      )}

      {user && (
        <div className="tabs">
          <NavLink to="/board" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>
            <Tag size={13} /> Browse tasks
          </NavLink>
          <NavLink to="/services" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>
            <BookCheck size={13} /> Tutoring
          </NavLink>
          <NavLink to="/mine" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>
            <ListChecks size={13} /> My tickets
          </NavLink>
          <NavLink to="/messages" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>
            <MessageCircle size={13} /> Messages
            {unreadMessages > 0 && <span className="message-unread-badge">{unreadMessages}</span>}
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `tab-btn ${isActive ? "active" : ""}`}>
            <Wallet size={13} /> My stats
          </NavLink>
        </div>
      )}
      {user && <FulfillmentPopup />}
    </>
  );
}
