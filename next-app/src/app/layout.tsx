import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "AI Chat with Memory - Townsquare Assignment",
  description: "AI-powered chat application with persistent memory using Gemini 2.5 Flash, Redis, and MCP protocol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} antialiased bg-zinc-950 text-zinc-50 min-h-screen font-sans`}
      >
        <div className="mx-auto min-h-screen flex flex-col bg-zinc-950">
          {children}
        </div>
      </body>
    </html>
  );
}
