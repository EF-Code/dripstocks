import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Inter({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "DripStocks — Payroll that streams by the second",
  description: "Stream tokenized stocks per second on Base Sepolia. Direct streams, claim links, and batch payroll with live vesting.",
  themeColor: "#0b1526",
  other: {
    "base:app_id": "6a9c0871384ac6b98c246e16",
  },
  openGraph: {
    title: "DripStocks — Payroll that streams by the second",
    description: "Fund a stream, watch it vest live, withdraw anytime. Built on Base.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
