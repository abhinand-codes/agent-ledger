import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <Toaster
          theme="dark"
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
      </body>
    </html>
  );
}
