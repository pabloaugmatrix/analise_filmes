"use client";

import { METRICS, type MetricId } from "@/features/dashboard/metrics";

interface Props {
  value: MetricId;
  onChange: (metric: MetricId) => void;
}

export function MetricTabs({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {METRICS.map((m) => {
        const active = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
              active
                ? "border-accent bg-accent/20 text-white"
                : "border-line bg-cardalt text-[#94a3b8] hover:border-accent hover:text-white"
            }`}
          >
            {m.short}
          </button>
        );
      })}
    </div>
  );
}
