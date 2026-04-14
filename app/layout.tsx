import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { PlatformsProvider } from "@/contexts/platforms-context";
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
  title: "AutoThreads - Tự động đăng bài Threads",
  description:
    "Hệ thống tự động tạo và đăng bài lên Threads sử dụng AI - Cá nhân hoá nội dung Marketing chuẩn SEO",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <Script src="https://js.puter.com/v2/" strategy="afterInteractive" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PlatformsProvider>{children}</PlatformsProvider>
      </body>
    </html>
  );
}
