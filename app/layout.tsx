import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/theme-provider";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthLayout } from "@/components/auth-layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TagHere Analytics",
  description: "B2B Store Analytics Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-neutral-900 dark:text-neutral-50`}
      >
        <div className="aurora-bg" aria-hidden="true" />
        <Providers>
          <AuthLayout>
            <Sidebar />
            <main className="md:pl-60 min-h-screen">
              {children}
            </main>
          </AuthLayout>
        </Providers>
      </body>
    </html>
  );
}
