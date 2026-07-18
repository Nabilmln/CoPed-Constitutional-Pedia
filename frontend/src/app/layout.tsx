import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoPed — Tanya UUD 1945",
  description:
    "Platform edukasi UUD 1945 dengan pencarian dokumen dan jawaban AI yang grounded.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={geistSans.variable}>{children}</body>
    </html>
  );
}
