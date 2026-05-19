import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LoL Fantasy League",
  description: "Compite con tus amigos para ver quién sube más ELO en League of Legends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
