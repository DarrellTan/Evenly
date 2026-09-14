"use client";

import React from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center p-0.5 rounded-full bg-surface-subtle border border-subtle">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`p-1.5 rounded-full transition-all duration-150 ${
          theme === "light"
            ? "bg-white text-emerald-600 shadow-apple-sm dark:bg-zinc-800 dark:text-emerald-400"
            : "text-muted hover:text-primary"
        }`}
        title="Light appearance"
        aria-label="Light appearance"
      >
        <Sun size={13} />
      </button>

      <button
        type="button"
        onClick={() => setTheme("system")}
        className={`p-1.5 rounded-full transition-all duration-150 ${
          theme === "system"
            ? "bg-white text-emerald-600 shadow-apple-sm dark:bg-zinc-800 dark:text-emerald-400"
            : "text-muted hover:text-primary"
        }`}
        title="System automatic appearance"
        aria-label="System appearance"
      >
        <Laptop size={13} />
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`p-1.5 rounded-full transition-all duration-150 ${
          theme === "dark"
            ? "bg-white text-emerald-600 shadow-apple-sm dark:bg-zinc-800 dark:text-emerald-400"
            : "text-muted hover:text-primary"
        }`}
        title="Dark appearance"
        aria-label="Dark appearance"
      >
        <Moon size={13} />
      </button>
    </div>
  );
}
