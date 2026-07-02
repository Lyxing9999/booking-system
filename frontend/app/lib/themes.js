export const THEMES = {
  "ps5-default": {
    id: "ps5-default",
    name: "PS5 Classic",
    description: "Official PlayStation blue on deep navy — the default gaming vibe",
    preview: ["#003087", "#0070d1", "#0d1117"],
    mode: "dark",
    vars: {
      "--theme-bg": "#0d1117",
      "--theme-surface": "#161b22",
      "--theme-header": "#1c2333",
      "--theme-accent": "#0070d1",
      "--theme-accent-hover": "#3399ff",
      "--theme-text": "#f0f6fc",
      "--theme-text-muted": "#8b949e",
      "--theme-border": "#30363d",
      "--theme-card": "#21262d",
      "--theme-input": "#0d1117",
      "--theme-hover": "#2d333b",
      "--theme-tag-available": "#238636",
    },
  },
  "midnight-lounge": {
    id: "midnight-lounge",
    name: "Midnight Lounge",
    description: "Purple lounge lighting — relaxed late-night sessions",
    preview: ["#2d1b4e", "#7c3aed", "#0f0a1a"],
    mode: "dark",
    vars: {
      "--theme-bg": "#0f0a1a",
      "--theme-surface": "#1a1229",
      "--theme-header": "#251a3d",
      "--theme-accent": "#7c3aed",
      "--theme-accent-hover": "#a78bfa",
      "--theme-text": "#f3e8ff",
      "--theme-text-muted": "#a78bfa",
      "--theme-border": "#3b2d5c",
      "--theme-card": "#1e1533",
      "--theme-input": "#130d22",
      "--theme-hover": "#2a1f45",
      "--theme-tag-available": "#6d28d9",
    },
  },
  "neon-arena": {
    id: "neon-arena",
    name: "Neon Arena",
    description: "Esports neon energy — bold colors for competitive play",
    preview: ["#ff006e", "#00f5d4", "#0a0a0f"],
    mode: "dark",
    vars: {
      "--theme-bg": "#0a0a0f",
      "--theme-surface": "#12121a",
      "--theme-header": "#1a1a28",
      "--theme-accent": "#ff006e",
      "--theme-accent-hover": "#ff4d94",
      "--theme-text": "#fafafa",
      "--theme-text-muted": "#00f5d4",
      "--theme-border": "#2a2a3d",
      "--theme-card": "#16161f",
      "--theme-input": "#0a0a0f",
      "--theme-hover": "#222230",
      "--theme-tag-available": "#00f5d4",
    },
  },
  "clean-light": {
    id: "clean-light",
    name: "Clean Light",
    description: "Bright and minimal — easy on the eyes for daytime booking",
    preview: ["#ffffff", "#2563eb", "#f8fafc"],
    mode: "light",
    vars: {
      "--theme-bg": "#f8fafc",
      "--theme-surface": "#ffffff",
      "--theme-header": "#ffffff",
      "--theme-accent": "#2563eb",
      "--theme-accent-hover": "#1d4ed8",
      "--theme-text": "#0f172a",
      "--theme-text-muted": "#64748b",
      "--theme-border": "#e2e8f0",
      "--theme-card": "#ffffff",
      "--theme-input": "#ffffff",
      "--theme-hover": "#f1f5f9",
      "--theme-tag-available": "#16a34a",
    },
  },
};

export const DEFAULT_THEME = "ps5-default";
export const THEME_STORAGE_KEY = "ps5-booking-theme";

export function getTheme(id) {
  return THEMES[id] || THEMES[DEFAULT_THEME];
}

export function isLightTheme(id) {
  return getTheme(id).mode === "light";
}

export function applyTheme(id) {
  const theme = getTheme(id);
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.setAttribute("data-theme", id);
  root.style.colorScheme = theme.mode;
  if (typeof document !== "undefined") {
    document.body.style.background = theme.vars["--theme-bg"];
    document.body.style.color = theme.vars["--theme-text"];
  }
  return theme;
}

export function getAntdThemeConfig(themeId) {
  const t = getTheme(themeId);
  const v = t.vars;
  return {
    token: {
      colorPrimary: v["--theme-accent"],
      colorPrimaryHover: v["--theme-accent-hover"],
      colorBgBase: v["--theme-bg"],
      colorBgContainer: v["--theme-card"],
      colorBgElevated: v["--theme-surface"],
      colorBgLayout: v["--theme-bg"],
      colorText: v["--theme-text"],
      colorTextSecondary: v["--theme-text-muted"],
      colorTextPlaceholder: v["--theme-text-muted"],
      colorBorder: v["--theme-border"],
      colorBorderSecondary: v["--theme-border"],
      colorFillAlter: v["--theme-hover"],
      colorFillSecondary: v["--theme-hover"],
      colorFillTertiary: v["--theme-hover"],
      borderRadius: 8,
      wireframe: false,
    },
    components: {
      Layout: {
        bodyBg: v["--theme-bg"],
        headerBg: v["--theme-header"],
        siderBg: v["--theme-header"],
      },
      Menu: {
        itemBg: v["--theme-header"],
        subMenuItemBg: v["--theme-surface"],
        itemColor: v["--theme-text"],
        itemHoverColor: v["--theme-accent-hover"],
        itemSelectedColor: v["--theme-accent"],
      },
      Table: {
        headerBg: v["--theme-header"],
        rowHoverBg: v["--theme-hover"],
        borderColor: v["--theme-border"],
        colorBgContainer: v["--theme-card"],
      },
      Card: {
        colorBgContainer: v["--theme-card"],
        colorBorderSecondary: v["--theme-border"],
      },
      Modal: {
        contentBg: v["--theme-card"],
        headerBg: v["--theme-card"],
        titleColor: v["--theme-text"],
      },
      Input: {
        colorBgContainer: v["--theme-input"],
        activeBorderColor: v["--theme-accent"],
        hoverBorderColor: v["--theme-accent-hover"],
      },
      Select: {
        colorBgContainer: v["--theme-input"],
        optionSelectedBg: v["--theme-hover"],
      },
      DatePicker: {
        colorBgContainer: v["--theme-input"],
      },
      Button: {
        defaultBg: v["--theme-card"],
        defaultColor: v["--theme-text"],
        defaultBorderColor: v["--theme-border"],
      },
      Pagination: {
        itemBg: v["--theme-card"],
        itemActiveBg: v["--theme-accent"],
      },
      Dropdown: {
        colorBgElevated: v["--theme-card"],
      },
      Popover: {
        colorBgElevated: v["--theme-card"],
      },
      Message: {
        contentBg: v["--theme-card"],
      },
      Empty: {
        colorTextDescription: v["--theme-text-muted"],
      },
      Typography: {
        colorText: v["--theme-text"],
        colorTextSecondary: v["--theme-text-muted"],
      },
    },
  };
}
