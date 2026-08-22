import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/layout/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // The template is what makes a pinned tab or a bookmark legible — every page
  // shared the one title before, so five open tabs were indistinguishable.
  title: {
    default: "AI Job Hunter",
    template: "%s · AI Job Hunter",
  },
  description:
    "Scrape job boards on a schedule, find the people behind the postings, and send outreach you approved.",
  applicationName: "AI Job Hunter",
};

// Separate from `metadata` because Next moved it there. The theme colour makes
// mobile browser chrome follow the page instead of fighting it.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
