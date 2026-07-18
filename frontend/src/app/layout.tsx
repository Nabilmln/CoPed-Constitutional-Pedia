import type { Metadata, Viewport } from "next";
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
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "CoPed — Tanya UUD 1945",
    description:
      "Pahami UUD 1945 melalui percakapan berbasis dokumen dan rujukan pasal.",
    locale: "id_ID",
    type: "website",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: "#10110f",
  width: "device-width",
  initialScale: 1,
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
