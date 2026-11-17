import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, Martian_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { ThemedToaster } from "@/components/themed-toaster";

// Runs before React hydrates, so the right theme is on screen for the very
// first paint — no light-mode flash while the app figures out what you last
// picked. Falls back to the OS preference the first time anyone visits.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
`;

// Display: a soft-serif for the ledger's own voice — the one place the app
// allows itself some editorial character, used sparingly on headings only.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
});

// Body/UI: a grotesk with more presence than the usual default, carrying
// every control, label and paragraph.
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: "variable",
});

// Data: hashes, timestamps and stepIds get a mono face built for reading
// fixed-width figures, not just code.
const martianMono = Martian_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: "variable",
});

export const metadata: Metadata = {
  title: "Agent Ledger — tamper-evident AI agent audit trails",
  description:
    "Every step an AI agent takes, written to a SHA-256 hash chain you can verify yourself. Run an agent, watch the ledger build live, then try to tamper with it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${hankenGrotesk.variable} ${martianMono.variable}`}
      >
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
        <ThemedToaster />
      </body>
    </html>
  );
}
