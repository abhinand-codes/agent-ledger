import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, Martian_Mono } from "next/font/google";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body
        className={`${fraunces.variable} ${hankenGrotesk.variable} ${martianMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
