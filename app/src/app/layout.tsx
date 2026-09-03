import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DripStocks — Stocks as Streaming Money",
  description: "Stream Coinbase Tokenized Stocks (AAPLc, NVDAc) per second on Base. Built for Base Builder Quest.",
  openGraph: {
    title: "DripStocks — Stocks as Streaming Money",
    description: "Your salary, now streaming in NVDAc per second. Built on Base with B20.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#fafaf9] text-zinc-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
