export interface RegressionLine {
  slope: number;
  intercept: number;
}

export function linearRegression(
  points: Array<{ x: number; y: number }>
): RegressionLine | null {
  const valid = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const n = valid.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of valid) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function regressionEndpoints(
  xs: number[],
  line: RegressionLine
): [number, number] {
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  return [line.slope * minX + line.intercept, line.slope * maxX + line.intercept];
}

export function formatCurrencyUSD(value: number, fractionDigits = 0): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatCompactUSD(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}
