import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MoviesProvider } from "@/features/dashboard/MoviesContext";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Cinema Analytics Dashboard",
  description:
    "Painel de decisao estrategica e analise financeira de filmes (TMDB, 2006-2026).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-bg font-sans text-slate-200 antialiased">
        <MoviesProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="mx-auto w-full max-w-[1400px] flex-1 p-6 md:p-8">
              {children}
            </main>
          </div>
        </MoviesProvider>
      </body>
    </html>
  );
}
