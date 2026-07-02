"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import api from "../lib/api";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  getTheme,
  getAntdThemeConfig,
  isLightTheme,
} from "../lib/themes";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(DEFAULT_THEME);
  const [ready, setReady] = useState(false);

  const setTheme = useCallback((id, persist = true) => {
    const next = getTheme(id).id;
    applyTheme(next);
    setThemeIdState(next);
    if (persist && typeof window !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
    applyTheme(stored);
    setThemeIdState(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const res = await api.get("/user/profile");
        if (res.data?.theme) {
          setTheme(res.data.theme, true);
        }
      } catch {
        // Not logged in — keep localStorage theme
      }
    })();
  }, [ready, setTheme]);

  const saveTheme = async (id) => {
    setTheme(id, true);
    try {
      await api.patch("/user/profile", { theme: id });
    } catch {
      // Theme still applied locally
    }
  };

  const antdConfig = useMemo(() => {
    const config = getAntdThemeConfig(themeId);
    return {
      ...config,
      algorithm: isLightTheme(themeId)
        ? antdTheme.defaultAlgorithm
        : antdTheme.darkAlgorithm,
    };
  }, [themeId]);

  return (
    <ThemeContext.Provider value={{ themeId, setTheme, saveTheme, ready }}>
      <ConfigProvider theme={antdConfig}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
