import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import { ViewTransition } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const description =
  "Moderator-curated Q&A threads for the Pakistani Students Association at FAU Erlangen-Nürnberg.";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FAU PSA Forum",
    template: "%s · FAU PSA Forum",
  },
  description,
  openGraph: {
    type: "website",
    siteName: "FAU PSA Forum",
    title: "FAU PSA Forum",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#08090a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader />
          <ViewTransition default="page">
            <main
              id="main"
              tabIndex={-1}
              className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 focus:outline-none sm:px-6 sm:py-12"
            >
              {children}
            </main>
          </ViewTransition>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
