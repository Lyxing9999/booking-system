import Script from "next/script";

const THEME_INIT = `
(function () {
  try {
    var key = "ps5-booking-theme";
    var themes = {
      "ps5-default": {
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
        "--theme-tag-available": "#238636"
      },
      "midnight-lounge": {
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
        "--theme-tag-available": "#6d28d9"
      },
      "neon-arena": {
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
        "--theme-tag-available": "#00f5d4"
      },
      "clean-light": {
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
        "--theme-tag-available": "#16a34a"
      }
    };
    var id = localStorage.getItem(key) || "ps5-default";
    var vars = themes[id] || themes["ps5-default"];
    var root = document.documentElement;
    root.setAttribute("data-theme", id);
    Object.keys(vars).forEach(function (k) {
      root.style.setProperty(k, vars[k]);
    });
    root.style.colorScheme = id === "clean-light" ? "light" : "dark";
  } catch (e) {}
})();
`;

export default function ThemeInitScript() {
  return (
    <Script
      id="theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: THEME_INIT }}
    />
  );
}
