import type { Metadata } from "next";
import { Geist, Geist_Mono, Michroma, Poppins } from "next/font/google";
import "./globals.css";
import "../style/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const michroma = Michroma({
  variable: "--font-michroma",
  subsets: ["latin"],
  weight: "400",
});

const poppins = Poppins({
  variable: "--font-poppins", 
  subsets: ["latin"],
  weight: ["200", "300", "400"],
});

export const metadata: Metadata = {
  title: "CoPed",
  description: "Platform edukasi digital untuk mempelajari UUD 1945 dengan AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preload Spline resources for faster loading */}
        <link rel="preconnect" href="https://prod.spline.design" />
        <link rel="dns-prefetch" href="https://prod.spline.design" />
        <link
          rel="preload"
          href="https://prod.spline.design/af8BjZyLq84kzOGX/scene.splinecode"
          as="fetch"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${michroma.variable} ${poppins.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
