import type { Metadata } from "next";
import { Martian_Mono } from "next/font/google";
import localFont from "next/font/local";
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

// Display: Gambetta — a sharp, high-contrast serif with the gravitas of an
// old stock certificate or legal instrument, not another soft editorial
// serif. Self-hosted from Fontshare (not Google Fonts, deliberately — this
// app isn't an Artifact and carries no CDN allowlist, so the typeface
// doesn't have to be one everyone else's AI-generated page also reaches for).
const gambetta = localFont({
  src: [
    { path: "./fonts/gambetta-variable.woff2", weight: "300 700", style: "normal" },
    { path: "./fonts/gambetta-variable-italic.woff2", weight: "300 700", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
});

// Body/UI: Switzer — a precise Swiss grotesk, the engineering counterweight
// to Gambetta's document-of-record voice.
const switzer = localFont({
  src: [
    { path: "./fonts/switzer-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/switzer-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/switzer-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/switzer-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
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
        className={`${gambetta.variable} ${switzer.variable} ${martianMono.variable}`}
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
