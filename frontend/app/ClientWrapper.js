"use client";
import { useEffect } from "react";

export default function AntdWarningSuppressor({ children }) {
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

  return children;
}
