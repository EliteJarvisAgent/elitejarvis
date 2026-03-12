import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Elite Jarvis Dashboard",
  description: "AI Agent Management Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
          :root {
            color-scheme: dark;
          }
        `}</style>
      </head>
      <body className="bg-slate-950 text-slate-50">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
