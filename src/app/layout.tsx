import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Free Screen Recorder: Capture, Annotate ...",
  description:
    "Record your screen, capture moments, and annotate with our free online tool. No downloads required, easy to use, and perfect for tutorials, demos, and more.",
  keywords: [
    "online screen recorder",
    "screen recording software",
    "tutorial recording",
    "demo recording",
    "video annotation",
    "screen capture",
    "free screen recorder",
    "screen recorder online",
    "online screen capture",
  ],
  authors: [{ name: " Akash Badole" }],
  openGraph: {
    title: " Free Screen Recorder: Capture, Annotate....",
    description:
      "Record your screen, capture moments, and annotate with our free online tool. No downloads required, easy to use, and perfect for tutorials, demos, and more.",
    url: "",
    siteName: "",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: " Free Screen Recorder: Capture, Annotate....",
    description:
      "Record your screen, capture moments, and annotate with our free online tool. No downloads required, easy to use, and perfect for tutorials, demos, and more.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
