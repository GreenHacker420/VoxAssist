import '@ant-design/v5-patch-for-react-19';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

import AntdProvider from "@/components/providers/AntdProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VoxAssist - AI Voice Calling Platform",
  description: "Production-ready AI-powered voice calling agent platform with real-time transcription, analytics, and CRM integration.",
  keywords: "AI, voice calling, transcription, analytics, CRM, customer service",
  authors: [{ name: "VoxAssist Team" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased landing-animated-bg`}>
        <AntdProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AntdProvider>
      </body>
    </html>
  );
}
