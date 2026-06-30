"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/generos", label: "Analise por Genero" },
  { href: "/filmes", label: "Analise por Filme" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-line bg-card px-5 shadow-[0_2px_10px_rgba(0,0,0,0.2)] md:px-8">
      <Link href="/generos" className="flex items-center gap-2.5">
        <span className="text-2xl">🎬</span>
        <span className="text-xl font-bold tracking-wide text-accent">
          CineAnalytics
        </span>
      </Link>

      <div className="flex items-center gap-1 md:gap-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${active ? "nav-link-active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <span className="hidden text-sm font-medium text-[#94a3b8] sm:inline">
        TMDB (2006-2026)
      </span>
    </nav>
  );
}
