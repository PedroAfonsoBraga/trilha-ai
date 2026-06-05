import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trilha — Estudos inteligentes com IA",
  description:
    "Flashcards inteligentes, fichamento ABNT e cronogramas de estudo gerados por IA para concursos públicos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
