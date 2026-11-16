"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  window.dispatchEvent(new Event("themechange"));
}

/**
 * A real light/dark switch, not just unused CSS variables. The initial
 * theme is decided before paint by the blocking script in layout.tsx (see
 * THEME_INIT_SCRIPT) so there is no flash of the wrong theme; this button
 * only has to pick up whatever that script already applied and let the
 * person override it.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  if (!theme) {
    return <span className="size-8 shrink-0" aria-hidden="true" />;
  }

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    window.localStorage.setItem("theme", next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card/60 text-muted-foreground backdrop-blur-sm transition-[color,border-color,transform] duration-150 hover:border-chain/50 hover:text-foreground active:scale-90"
    >
      {theme === "dark" ? (
        <Sun className="size-3.5" />
      ) : (
        <Moon className="size-3.5" />
      )}
    </button>
  );
}
