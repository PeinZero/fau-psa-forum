import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 focus:outline-none"
        >
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
