import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { AuthProvider } from "@/lib/auth";
import { Protected } from "@/components/Protected";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "NexBoard",
  description: "Developer-first boards and tasks",
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <Protected>{children}</Protected>
        </AuthProvider>
      </body>
    </html>
  );
}
