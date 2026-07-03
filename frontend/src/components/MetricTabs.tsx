"use client";

import { METRICS, type MetricId } from "@/features/dashboard/metrics";

interface Props {
  value: MetricId;
  onChange: (metric: MetricId) => void;
  disabled?: MetricId[];
}

export function MetricTabs({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {METRICS.map((m) => {
        const active = m.id === value;
        const isDisabled = disabled?.includes(m.id);
        const cls = active
          ? "rounded-md border px-3 py-1.5 text-xs font-medium border-accent bg-accent/20 text-white"
          : isDisabled
          ? "rounded-md border px-3 py-1.5 text-xs font-medium border-line bg-cardalt text-[#94a3b8] cursor-not-allowed opacity-30"
          : "rounded-md border px-3 py-1.5 text-xs font-medium border-line bg-cardalt text-[#94a3b8] hover:border-accent hover:text-white";
        return (
          <button
            key={m.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(m.id)}
            className={cls}
          >
            {m.short}
          </button>
        );
      })}
    </div>
  );
}
