import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "LA Fried Chicken - POS & Store Management 🍗🌸",
  description: "Sistem Kasir Pintar, Kontrol Stok, dan Laporan Kios LA Fried Chicken",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#FDF2F4] text-gray-800 antialiased pb-20 md:pb-6">
        <Navbar />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-5">
          {children}
        </main>
      </body>
    </html>
  );
}
