"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

/**
 * sonner's own `theme` prop only ever looks at the OS color-scheme query,
 * which isn't what we want once the person can override that with the
 * in-app toggle (theme-toggle.tsx). This reads the real state — the
 * `dark` class on <html> — on mount and whenever the toggle fires a
 * "themechange" event, so toasts always match whatever is on screen.
 */
export function ThemedToaster() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const read = () =>
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    read();
    window.addEventListener("themechange", read);
    return () => window.removeEventListener("themechange", read);
  }, []);

  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border/80 !bg-card !text-foreground !shadow-lg !font-sans",
          title: "!text-sm !font-medium",
          description: "!text-muted-foreground !text-[13px]",
        },
      }}
    />
  );
}
