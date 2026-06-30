interface Props {
  label: string;
  value: string;
  deltaText: string;
  positive: boolean;
  hint?: string;
}

export function KpiCard({ label, value, deltaText, positive, hint }: Props) {
  return (
    <div className="panel flex flex-col gap-1.5 p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-2xl font-semibold text-slate-50">{value}</span>
      <div className="flex items-center gap-1.5 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium ${
            positive
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-rose-500/15 text-rose-300"
          }`}
        >
          {positive ? "▲" : "▼"} {deltaText}
        </span>
        {hint ? <span className="text-slate-500">{hint}</span> : null}
      </div>
    </div>
  );
}
