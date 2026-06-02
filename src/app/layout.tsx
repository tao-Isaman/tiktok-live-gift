import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TikTok Gift Live — Overlay Studio",
  description:
    "Build a playlist of on-screen elements and show it on your TikTok Live via a single overlay URL.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      {/* Body stays transparent (see globals.css) so the overlay route can be
          captured with a see-through background by OBS / TikTok LIVE Studio. */}
      <body>{children}</body>
    </html>
  );
}
