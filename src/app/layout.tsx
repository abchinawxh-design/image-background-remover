export const runtime = 'edge';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://stepnewworld.com"),
  title: "Image Background Remover - Remove Background from Images Online",
  description:
    "Remove background from images online in seconds. Upload your photo, erase the background automatically, and download a transparent PNG-style result instantly.",
  keywords: [
    "image background remover",
    "remove background from image",
    "background remover online",
    "transparent png maker",
  ],
  openGraph: {
    title: "Image Background Remover",
    description:
      "Upload an image, remove its background automatically, and download the result in seconds.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 text-slate-100 antialiased`}
      >
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
