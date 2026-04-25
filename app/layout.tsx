import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sandigan — AI legal rights navigator for Filipino workers",
  description:
    "Plain-language, source-cited labor rights guidance for the Philippines. Sa tama at totoo, may Sandigan ka.",
  applicationName: "Sandigan",
  authors: [{ name: "Sandigan" }],
  keywords: [
    "Philippines labor law",
    "worker rights",
    "legal assistant",
    "DOLE",
    "labor code",
  ],
  openGraph: {
    title: "Sandigan",
    description:
      "AI legal rights navigator for Filipino workers. Citation-first. Action-ready.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f2a43",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSans.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen bg-paper antialiased">{children}</body>
    </html>
  );
}
