import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const ThemeContext = createContext(null);

function getThemeStorageKey(userId) {
  return userId ? `claimco_theme_${userId}` : "claimco_theme_logged_out";
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsDarkMode(false);
      applyTheme(false, null);
      setIsReady(true);
      return;
    }

    const themeKey = getThemeStorageKey(user.id);
    const stored = localStorage.getItem(themeKey);
    const legacyStored = localStorage.getItem("claimco_theme");
    const dark = stored !== null ? JSON.parse(stored) : legacyStored !== null ? JSON.parse(legacyStored) : false;

    if (stored === null && legacyStored !== null) {
      localStorage.setItem(themeKey, legacyStored);
      localStorage.removeItem("claimco_theme");
    }

    setIsDarkMode(dark);
    applyTheme(dark, user.id);
    setIsReady(true);
  }, [user?.id]);

  function applyTheme(dark, userId) {
    const root = document.documentElement;
    const shouldApply = Boolean(dark) && Boolean(userId);
    root.classList.toggle("dark-mode", shouldApply);
  }

  function toggleDarkMode() {
    if (!user) return;
    const newValue = !isDarkMode;
    const themeKey = getThemeStorageKey(user.id);
    setIsDarkMode(newValue);
    localStorage.setItem(themeKey, JSON.stringify(newValue));
    applyTheme(newValue, user.id);
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, isReady }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
