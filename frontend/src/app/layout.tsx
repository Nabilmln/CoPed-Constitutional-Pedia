import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoPed",
  description:
    "Platform edukasi UUD 1945 dengan pencarian dokumen dan jawaban AI yang grounded.",
  icons: {
    icon: "/coped-logo-black-circle.png",
    shortcut: "/coped-logo-black-circle.png",
    apple: "/coped-logo-black-circle.png",
  },
  openGraph: {
    title: "CoPed",
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
      <body>{children}</body>
    </html>
  );
}
