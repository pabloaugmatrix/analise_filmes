"use client";

import { useCallback } from "react";

interface Props {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

// Slider duplo (dois thumbs) sem dependencias externas
export function YearRangeFilter({ min, max, value, onChange }: Props) {
  const [lo, hi] = value;

  const handleLo = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Math.min(Number(e.target.value), hi - 1);
      onChange([next, hi]);
    },
    [hi, onChange]
  );

  const handleHi = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Math.max(Number(e.target.value), lo + 1);
      onChange([lo, next]);
    },
    [lo, onChange]
  );

  const pctLo = ((lo - min) / (max - min)) * 100;
  const pctHi = ((hi - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>De <b className="text-slate-200">{lo}</b></span>
        <span>ate <b className="text-slate-200">{hi}</b></span>
      </div>
      <div className="relative h-6">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink-700" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-500"
          style={{ left: `${pctLo}%`, right: `${100 - pctHi}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={lo}
          onChange={handleLo}
          className="range-thumb pointer-events-none absolute left-0 right-0 w-full"
          aria-label="Ano minimo"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={hi}
          onChange={handleHi}
          className="range-thumb pointer-events-none absolute left-0 right-0 w-full"
          aria-label="Ano maximo"
        />
      </div>
    </div>
  );
}
