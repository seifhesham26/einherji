import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono, IBM_Plex_Mono } from "next/font/google";
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

// The marketing surface only. Archivo carries a width axis, and wide-and-heavy
// is what makes a headline read as instrument labelling rather than as another
// grotesque set very large.
const archivo = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["wdth"],
});

// The data face. Everything on the landing page that is a number, a key, a
// status or a source name is set in it, because those are readouts and readouts
// are monospaced.
const plexMono = IBM_Plex_Mono({
  variable: "--font-console",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  // The template is what makes a pinned tab or a bookmark legible — every page
  // shared the one title before, so five open tabs were indistinguishable.
  title: {
    default: "Einherji",
    template: "%s · Einherji",
  },
  description:
    "Scrape job boards on a schedule, find the people behind the postings, and send outreach you approved.",
  applicationName: "Einherji",
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
