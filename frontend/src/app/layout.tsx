import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cinema Analytics Dashboard",
  description:
    "Painel de decisao estrategica e analise financeira de filmes (TMDB, ultimos 20 anos).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-ink-950 font-sans text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
