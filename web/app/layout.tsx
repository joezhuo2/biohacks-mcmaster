import type { Metadata } from "next";
import { Geist, PT_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const ptSerif = PT_Serif({
  variable: "--font-pt-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "AFO Care",
  description: "Stability and progression dashboard for Alex's adaptive ankle-foot orthosis",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${ptSerif.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
