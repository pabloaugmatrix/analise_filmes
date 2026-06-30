export const GENRE_COLORS: string[] = [
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#64748b",
];

export function buildGenreColorMap(genres: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  genres.forEach((g, i) => {
    map[g] = GENRE_COLORS[i % GENRE_COLORS.length];
  });
  return map;
}

// Config base de eixos para o tema escuro
export const darkAxis = {
  axisLine: { lineStyle: { color: "#334155" } },
  axisLabel: { color: "#94a3b8", fontSize: 11 },
  splitLine: { lineStyle: { color: "#1e293b" } },
} as const;

export const darkTooltip = {
  backgroundColor: "rgba(11,17,32,0.95)",
  borderColor: "#334155",
  borderWidth: 1,
  textStyle: { color: "#e2e8f0", fontSize: 12 },
} as const;
