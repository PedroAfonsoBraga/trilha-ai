import type { Metadata } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import PosthogProvider from "@/components/app/posthog-provider";

const cabinetGrotesk = localFont({
  src: "../public/fonts/CabinetGrotesk-Variable.woff2",
  variable: "--font-cabinet",
  display: "swap",
});

const satoshi = localFont({
  src: "../public/fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  display: "swap",
});

const geistMono = localFont({
  src: "../public/fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trilha — Estudos inteligentes com IA",
  description:
    "Cronogramas inteligentes, flashcards e análise de editais por IA — a plataforma definitiva para concurseiros.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${cabinetGrotesk.variable} ${satoshi.variable} ${geistMono.variable} ${satoshi.className}`}
    >
      <body className="antialiased">
        <Suspense fallback={null}>
          <PosthogProvider>{children}</PosthogProvider>
        </Suspense>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
