import { META } from "@/features/dashboard/types";
import type { Kpis } from "@/features/dashboard/types";
import { KpiCard } from "./KpiCard";

interface Props {
  kpis: Kpis;
}

export function KpiRow({ kpis }: Props) {
  const roiOk = kpis.roiMedioPct >= META.roiPct;
  const assertOk = kpis.taxaAssertividadePct >= META.assertividadePct;
  const receitaOk = kpis.receitaMediaMilhoes >= META.receitaMediaMilhoes;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="ROI Real Medio"
        value={`${kpis.roiMedioPct.toFixed(2)}%`}
        deltaText={`${(kpis.roiMedioPct - META.roiPct).toFixed(2)}% vs meta`}
        positive={roiOk}
        hint={`Meta: > ${META.roiPct}%`}
      />
      <KpiCard
        label="Taxa de Assertividade"
        value={`${kpis.taxaAssertividadePct.toFixed(2)}%`}
        deltaText={`${(kpis.taxaAssertividadePct - META.assertividadePct).toFixed(2)}% da meta`}
        positive={assertOk}
        hint={`Meta: > ${META.assertividadePct}%`}
      />
      <KpiCard
        label="Receita Real Media"
        value={`$${kpis.receitaMediaMilhoes.toFixed(1)}M`}
        deltaText={`$${(kpis.receitaMediaMilhoes - META.receitaMediaMilhoes).toFixed(1)}M vs meta`}
        positive={receitaOk}
        hint={`Meta: > $${META.receitaMediaMilhoes}M`}
      />
      <KpiCard
        label="Filmes no Filtro"
        value={kpis.totalFilmes.toLocaleString("en-US")}
        deltaText={kpis.totalFilmes > 0 ? "ativos" : "vazio"}
        positive={kpis.totalFilmes > 0}
        hint="apos aplicar filtros"
      />
    </div>
  );
}
