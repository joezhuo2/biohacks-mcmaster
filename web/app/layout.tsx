import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AFO Care",
  description: "Stability and progression dashboard for Alex's adaptive ankle-foot orthosis",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plex.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
