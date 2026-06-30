# Streamlit Dashboard — [DEPRECIADO]

> **Status: OBSOLETO — não mantido.** Este documento descreve a versão de
> visualização **legada** do projeto **Cinema Analytics**, baseada em Streamlit +
> Plotly. Ela foi **substituída** pelo frontend em Next.js + ECharts (ver
> [`docs/frontend.md`](./frontend.md)). O conteúdo abaixo é mantido como
> **registro histórico** da arquitetura original e para referência de migração.

---

## 1. Contexto Histórico

A primeira versão do dashboard foi entregue como um protótipo único em
**Streamlit**, com o objetivo de validar rapidamente as análises e os KPIs
definidos no documento acadêmico do projeto. Após a validação, a camada de
visualização foi reescrita em Next.js (React/TypeScript) por exigências de
arquitetura, desempenho e experiência de usuário. **Este diretório não recebe
mais evoluções.**

> **Recomendação oficial:** toda análise nova deve ser implementada no frontend
> Next.js (`frontend/`). Não estender este dashboard.

---

## 2. Stack (referência)

| Tecnologia | Versão   | Finalidade                          |
|------------|----------|-------------------------------------|
| Streamlit  | 1.40.1   | Framework de dashboard em Python    |
| Plotly     | 5.24.1   | Gráficos interativos                |
| pandas     | 2.2.3    | Manipulação tabular (compartilhada) |

---

## 3. Estrutura

```
streamlit_dashboard/
└── app_dashboard.py   # Aplicação monolítica (único arquivo)
```

A aplicação é um script único que lê a base Trusted diretamente do disco, monta
filtros laterais e renderiza KPIs e gráficos em abas.

---

## 4. Funcionamento (resumo)

1. **Configuração de página** (`st.set_page_config`) em layout *wide*.
2. **Carga de dados** com `@st.cache_data`, lendo
   `dados/processados/cinematografia_analytics_trusted.csv`. Em caso de arquivo
   ausente, exibe erro e interrompe (`st.stop()`).
3. **Filtros laterais**: multiselect de gênero principal e *slider* de período
   de lançamento, aplicados de forma reativa ao DataFrame.
4. **KPIs** (3 métricas com metas): ROI Real Médio (`> 20%`), Taxa de
   Assertividade (`> 60%`), Receita Real Média por Filme (`> $50M`).
5. **Abas por persona**:
   - **Investidores & Produtores**: scatter Orçamento × Receita (com linha de
     tendência OLS e tamanho por lucro) e barras de ROI médio por gênero.
   - **Analistas de Mercado**: scatter Nota × Receita, scatter Duração × ROI
     (cor por nota, escala Viridis) e tabela dos 20 maiores lucros.

---

## 5. Mapeamento para o Frontend Atual

A maioria das análises foi reimplementada no Next.js com equivalentes em ECharts:

| Análise (Streamlit)                       | Equivalente Next.js                          |
|-------------------------------------------|----------------------------------------------|
| Scatter Orçamento × Receita (OLS)         | `BudgetRevenueScatter`                       |
| Barras de ROI médio por gênero            | `GenreMetricBar` / `GenreMetricBarSwitcher`  |
| Scatter Nota × Receita                    | `VoteProfitScatter` (Nota × Lucro)           |
| Scatter Duração × ROI (cor por nota)      | `RuntimeRoiScatter`                          |
| Tabela Top 20 por lucro                   | `TopMoviesTable` / `MovieTable` (página /tabela) |
| Filtros laterais (gênero + período)       | `FiltersBar` (gêneros + período + orçamento) |

---

## 6. Por que foi substituído

- **Arquitetura monolítica:** lógica de negócio, estado e apresentação
  misturadas em um único script, dificultando manutenção e testes.
- **Falta de tipagem estática:** Python no nível de UI não oferecia as garantias
  do TypeScript estrito adotado no frontend.
- **Controle de UX limitado:** a estilização e a interatividade do Streamlit
  não atendiam aos requisitos visuais do projeto (paleta e componentes
  customizados).
- **Escalabilidade:** o modelo de gráficos isolados e filtros compartilhados do
  Next.js é mais sustentável para o crescimento do número de análises.

---

## 7. Execução (apenas para referência)

> ⚠️ **Não recomendado.** Prefira o frontend Next.js.

Caso seja necessário inspecionar a versão legada, a partir da raiz do projeto:

```bash
streamlit run streamlit_dashboard/app_dashboard.py
```

Requer `streamlit==1.40.1` e `plotly==5.24.1` instalados (presentes em
`requirements.txt`). A base Trusted deve existir em
`dados/processados/`.

---

## 8. Remoção Planejada

Este diretório está marcado para remoção em uma futura limpeza do repositório,
junto com as dependências Streamlit/Plotly de `requirements.txt`. Antes da
remoção, confirmar que nenhuma análise exclusiva permanece sem equivalente no
frontend Next.js.

---

*Documento de caráter histórico. Para a documentação atual da camada de
visualização, consulte [`docs/frontend.md`](./frontend.md).*
