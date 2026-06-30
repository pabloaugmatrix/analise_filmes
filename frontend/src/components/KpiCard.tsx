interface Props {
  title: string;
  value: string;
  meta?: string;
}

export function KpiCard({ title, value, meta }: Props) {
  return (
    <div className="card flex flex-col gap-1 p-5">
      <div className="text-sm font-medium text-[#94a3b8]">{title}</div>
      <div className="text-3xl font-bold text-slate-50">{value}</div>
      {meta ? <div className="text-xs text-[#94a3b8]">{meta}</div> : null}
    </div>
  );
}
