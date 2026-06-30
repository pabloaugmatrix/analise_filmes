interface Props {
  loading: boolean;
  error: string | null;
  empty?: boolean;
}

export function AsyncState({ loading, error, empty }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-[#94a3b8]">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-line border-t-accent" />
        <p>Carregando base analitica...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-bad">
        <p className="font-semibold">Erro ao carregar os dados</p>
        <code className="rounded-md bg-card px-3 py-1.5 text-xs text-[#94a3b8]">
          {error}
        </code>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-[#94a3b8]">
        <span className="text-2xl">🔎</span>
        <p>Nenhum filme corresponde aos filtros selecionados.</p>
      </div>
    );
  }
  return null;
}
