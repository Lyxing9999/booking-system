"use client";

import { useEffect } from "react";
import { ThemeProvider } from "./components/ThemeProvider";

export default function ClientWrapper({ children }) {
  useEffect(() => {
    if (typeof console !== "undefined") {
      const originalWarn = console.warn;
      console.warn = (...args) => {
        if (
          args[0] &&
          typeof args[0] === "string" &&
          args[0].includes("[antd: compatible]")
        ) {
          return;
        }
        originalWarn(...args);
      };
    }
  }, []);

  return <ThemeProvider>{children}</ThemeProvider>;
}
