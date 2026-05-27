import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "UCCD OmniResol - AI-Powered Complaint Management",
  description: "Enterprise-grade complaint management dashboard with 7-agent AI pipeline, SLA breach prediction, and regulatory compliance.",
  keywords: ["UCCD", "Complaint Management", "AI", "SLA", "Regulatory", "Dashboard"],
  authors: [{ name: "UCCD Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
