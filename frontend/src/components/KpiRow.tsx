import type { Kpis } from "@/features/dashboard/types";
import { KpiCard } from "./KpiCard";

interface Props {
  kpis: Kpis;
}

export function KpiRow({ kpis }: Props) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="ROI Real Medio"
        value={`${kpis.roiMedioPct.toFixed(1)}%`}
        meta={`Mediana: ${kpis.roiMedianaPct.toFixed(1)}%`}
      />
      <KpiCard
        title="Taxa de Assertividade"
        value={`${kpis.taxaAssertividadePct.toFixed(1)}%`}
        meta="Filmes lucrativos"
      />
      <KpiCard
        title="Receita Real Media por Filme"
        value={`$${kpis.receitaMediaMilhoes.toFixed(1)}M`}
        meta={`${kpis.totalFilmes.toLocaleString("pt-BR")} filmes na amostra`}
      />
      <KpiCard
        title="Filmes no Filtro"
        value={kpis.totalFilmes.toLocaleString("pt-BR")}
        meta="apos aplicar os filtros"
      />
    </div>
  );
}
