# Frontend — Cinema Analytics Dashboard

> Documento oficial de referência técnica da camada de **visualização** do projeto
> **Cinema Analytics**. Descreve a arquitetura, a organização do código, o fluxo
> de dados, os componentes e os procedimentos de execução. Destina-se à equipe de
> desenvolvimento para manutenção e evolução da aplicação.

---

## 1. Visão Geral

O frontend é uma aplicação **SPA multipage** construída em **Next.js 14 (App
Router)** com **React 18**, **TypeScript** estrito, **Tailwind CSS** e
**Apache ECharts**. Seu papel é consumir a base Trusted (gerada pelo pipeline
Python) e apresentar análises financeiras e estratégicas sobre o cinema
(2006–2026), com filtros reativos e gráficos interativos.

A aplicação é **somente leitura** em relação aos dados: ela nunca grava nada —
apenas lê o CSV Trusted e o expõe via uma rota de API interna.

---

## 2. Stack e Dependências

| Tecnologia       | Versão   | Finalidade                                      |
|------------------|----------|-------------------------------------------------|
| Next.js          | ^14.2.35 | Framework full-stack (App Router, rota de API)  |
| React            | ^18.3.1  | Biblioteca de UI                                |
| TypeScript       | ^5.6.3   | Tipagem estática (`strict: true`)               |
| Tailwind CSS     | ^3.4.14  | Estilização utilitária                          |
| ECharts          | ^5.5.1   | Motor de gráficos (canvas)                      |
| echarts-for-react| ^3.0.2   | Bind React para ECharts                         |
| PapaParse        | ^5.4.1   | Parser de CSV (servidor)                        |

> Node.js 18+ é requerido. As dependências estão em `frontend/package.json`.

---

## 3. Estrutura de Diretórios

```
frontend/
├── package.json              # Scripts e dependências
├── next.config.mjs           # Configuração do Next (reactStrictMode)
├── tailwind.config.ts        # Tema: cores, fontes, componentes
├── tsconfig.json             # Compilação TS + alias "@/*" -> "./src/*"
├── postcss.config.mjs        # Pipeline Tailwind/autoprefixer
└── src/
    ├── app/                  # Camada de rotas (App Router)
    │   ├── layout.tsx        # Shell global: Providers + Navbar + main
    │   ├── page.tsx          # "/" -> redireciona para /generos
    │   ├── globals.css       # Base Tailwind + classes utilitárias (.card, .chip, .select-dark...)
    │   ├── api/movies/route.ts  # Rota de API: lê e serve o CSV Trusted
    │   ├── generos/page.tsx     # Página "Análise por Gênero"
    │   ├── filmes/page.tsx      # Página "Análise por Filme"
    │   └── tabela/page.tsx      # Página "Tabela" (consulta bruta)
    ├── components/           # Componentes de apresentação reutilizáveis
    │   ├── Navbar.tsx, KpiRow.tsx, KpiCard.tsx, ChartPanel.tsx
    │   ├── AsyncState.tsx, FiltersBar.tsx, MetricTabs.tsx
    │   ├── GenreMetricBarSwitcher.tsx, TopMoviesTable.tsx, MovieTable.tsx
    │   └── charts/          # Componentes de gráfico (ECharts)
    │       ├── EChart.tsx (wrapper SSR-safe)
    │       ├── GenreRoiTimeline.tsx, GenreMetricBar.tsx
    │       ├── GenreBudgetHeatmap.tsx, DurationGenreLines.tsx
    │       ├── BudgetRevenueScatter.tsx, VoteProfitScatter.tsx
    │       └── RuntimeRoiScatter.tsx
    └── features/dashboard/   # Lógica de domínio e estado
        ├── types.ts          # Tipos de domínio (Movie, Kpis, META)
        ├── services.ts       # Cliente HTTP (fetch /api/movies)
        ├── MoviesContext.tsx # Provider global (carregamento + cache em memória)
        ├── aggregations.ts   # Filtros, faixas, médias/medianas, groupBy
        ├── stats.ts          # Regressão OLS, formatação de moeda/percentual
        ├── metrics.ts        # Definição das métricas trocáveis
        ├── chartTheme.ts     # Paleta e estilos de eixo/tooltip escuros
        ├── useFilters.ts     # Hook: estado dos filtros + KPIs derivados
        └── useTable.ts       # Hook: ordenação + paginação + busca (página Tabela)
```

> **Convenção de alias:** o caminho `@/` aponta para `src/` (definido em
> `tsconfig.json`). Todos os imports internos usam esse alias.

---

## 4. Arquitetura — Fluxo de Dados

A aplicação segue uma separação de responsabilidades em camadas:

```
CSV Trusted (dados/processados/)               [fonte única]
        │
        ▼  leitura no servidor (Node fs + PapaParse)
/api/movies/route.ts  ──►  cache em memória (módulo)  ──►  JSON
        │
        ▼  fetch (cache: "no-store")
features/dashboard/services.ts  (fetchMovies)
        │
        ▼
MoviesContext.tsx  (Provider) ── armazena Movie[] + loading + error
        │  exposto via useMovies()
        ▼
Páginas (app/*/page.tsx) ── usam hooks:
        ├── useFilters()  -> filtros + KPIs (páginas /generos, /filmes)
        └── useTable()    -> filtros + ordenação + busca + paginação (/tabela)
        │
        ▼
Components (apresentação pura) + Charts (ECharts)
```

### 4.1 Aquisição de dados
- **`app/api/movies/route.ts`**: rota de servidor que localiza o CSV Trusted
  (caminho padrão: `../dados/processados/...`, sobrescrevível por
  `TRUSTED_CSV_PATH`), faz o *parse* com PapaParse, converte tipos e aplica um
  **cache em memória por módulo** (o arquivo não muda durante a sessão de
  desenvolvimento). Retorna HTTP 404 com instrução caso a base não exista.
- **`features/dashboard/services.ts`**: `fetchMovies()` é o único ponto de
  acesso do cliente; usa `cache: "no-store"` e propaga mensagens de erro do
  servidor.
- **`features/dashboard/MoviesContext.tsx`**: `MoviesProvider` carrega os dados
  uma única vez no *mount* (com `AbortController` para cancelar em desmontagem),
  armazena `{ movies, loading, error }` e disponibiliza via `useMovies()`.

### 4.2 Lógica de domínio (`features/dashboard/`)
| Arquivo | Responsabilidade |
|---|---|
| `types.ts` | Interfaces `Movie`, `Kpis`, constantes `META` (metas dos KPIs) |
| `aggregations.ts` | `applyFilters`, `budgetBucket`, `runtimeBucket`, `mean`, `median`, `groupBy`, tipos `Filters`/`BudgetOp` |
| `stats.ts` | `linearRegression` (OLS), `regressionEndpoints`, formatadores (`formatCompactUSD`, `formatCurrencyUSD`, `formatPercent`) |
| `metrics.ts` | `METRICS` (Nota/ROI/Receita/Lucro) e `isLogMetric` (decide escala log) |
| `chartTheme.ts` | `GENRE_COLORS`, `buildGenreColorMap`, `darkAxis`, `darkTooltip` |
| `useFilters.ts` | Estado dos filtros (gêneros, período, orçamento), `filtered`, `kpis` e *handlers* |
| `useTable.ts` | Estende `useFilters` com ordenação de 3 estados, busca por nome e paginação incremental |

---

## 5. Padrões de Arquitetura React

A base de código adota convenções explícitas para manter componentes previsíveis:

- **Componente → Hook → Service → API:** os componentes são **de apresentação**;
  toda lógica com estado vive em *hooks* (`useFilters`, `useTable`); o acesso a
  dados passa pelo *service* (`fetchMovies`) e pela rota de API — nunca há
  `fetch` direto em componentes.
- **Estado de dados global via Context:** o `Movie[]` é carregado uma vez no
  topo da árvore; cada página deriva sua própria fatia filtrada com
  `useMemo`, evitando recomputações desnecessárias.
- **Gráficos isolados e sem estado próprio:** cada componente em
  `components/charts/` recebe `data` (e eventuais `allGenres`/`metric`) como
  *props* e produz um `EChartsOption`. Nenhum gráfico mantém estado de dados.
- **Renderização SSR-safe de ECharts:** o wrapper `EChart.tsx` importa
  `echarts-for-react` via `next/dynamic` com `ssr: false`, evitando acesso a
  `window` durante a renderização no servidor.

---

## 6. Design System

O tema é definido em `tailwind.config.ts` e complementado por classes utilitárias
em `globals.css`.

### 6.1 Paleta
| Token        | Hex       | Uso                              |
|--------------|-----------|----------------------------------|
| `bg`         | `#0f1115` | Fundo da aplicação               |
| `card`       | `#1a1d24` | Superfície de cartões            |
| `cardalt`    | `#252a36` | Superfície elevada (inputs)      |
| `line`       | `#2e3340` | Bordas e divisores               |
| `accent`     | `#6366f1` | Cor primária (indigo)            |
| `ok/warn/bad`| verde/âmbar/vermelho | Estados (lucro/prejuízo) |

### 6.2 Tipografia
A fonte **Inter** é carregada via `next/font/google` (otimização automática) e
exposta como variável CSS `--font-inter`, aplicada em `font-sans`.

### 6.3 Classes utilitárias (`globals.css`)
`.card`, `.select-dark`, `.input-dark`, `.chip`/`.chip-active`, `.nav-link`/
`.nav-link-active` — garantem consistência visual entre componentes.

---

## 7. Páginas e Rotas

### 7.1 `/generos` — Análise por Gênero
KPIs + grade de gráficos focada em gênero:
- **Evolução do ROI por Gênero** (linha temporal, escala log, destaque no *hover*).
- **Métrica por Gênero** (barras com 4 botões: Nota/ROI/Receita/Lucro).
- **Gênero × Orçamento** (heatmap do ROI médio).
- **Métrica por Duração e Gênero** (linhas por faixa de *runtime*).

### 7.2 `/filmes` — Análise por Filme
Foco no desempenho individual:
- **Orçamento × Receita** (scatter, bolha = lucro, reta OLS).
- **Nota × Lucro** (scatter + reta OLS).
- **Duração × ROI** (scatter, cor contínua por nota).
- **Top 20 Maiores Lucros** (tabela ranqueada).

### 7.3 `/tabela` — Consulta Bruta
- Tabela com 10 colunas, **ordenação de 3 estados** (desc → asc → neutro) por
  clique no cabeçalho, **busca por nome** (tolerante a acentos/maiúsculas) e
  **paginação incremental** (scroll infinito via `IntersectionObserver`).

### 7.4 `/` (raiz)
Redireciona para `/generos`.

---

## 8. Componentes Principais

| Componente | Descrição |
|---|---|
| `Navbar` | Barra superior fixa com 3 links e marca "CineAnalytics". |
| `FiltersBar` | Barra de filtros *sticky* (chips de gênero, período, orçamento). |
| `KpiRow` / `KpiCard` | Linha de 4 KPIs derivados dos filtros. |
| `ChartPanel` | Cartão com título/descrição que envolve qualquer gráfico. |
| `AsyncState` | Estados de carregamento, erro e vazio (filtros sem resultado). |
| `MetricTabs` | Botões para trocar a métrica ativa. |
| `GenreMetricBarSwitcher` | Barras por gênero + seletor de métrica. |
| `TopMoviesTable` | Tabela Top 20 por lucro (página /filmes). |
| `MovieTable` | Tabela paginada/ordenável com busca (página /tabela). |

### 8.1 Gráficos (`components/charts/`)
| Gráfico | Tipo | Responde a |
|---|---|---|
| `GenreRoiTimeline` | Linha (log) | Evolução do ROI por gênero ao longo dos anos |
| `GenreMetricBar` | Barras | Comparação de métrica entre gêneros |
| `GenreBudgetHeatmap` | Heatmap | ROI médio por gênero × faixa de orçamento |
| `DurationGenreLines` | Linha | Métrica por faixa de duração, por gênero |
| `BudgetRevenueScatter` | Scatter | Orçamento × receita (lucro, reta OLS) |
| `VoteProfitScatter` | Scatter | Nota × lucro (reta OLS) |
| `RuntimeRoiScatter` | Scatter | Duração × ROI (cor por nota) |
| `EChart` | — | Wrapper dinâmico (SSR desativado) |

---

## 9. Regras de Negócio no Frontend

- **Filtros compartilhados** (`applyFilters`): gênero (lista de inclusão — vazio
  ⇒ nenhum filme), período (anos invertidos são normalizados via `min/max`) e
  orçamento (`≥`/`≤` em milhões de dólares reais).
- **Escala logarítmica condicional** (`isLogMetric`): aplicada em ROI/Receita/
  Lucro (distribuição ampla com *outliers*); **não** em Nota (escala natural
  0–10) nem em dispersões com valores negativos relevantes (lucro/prejuízo), onde
  usa-se escala linear.
- **Tamanho de bolhas proporcional**: no `BudgetRevenueScatter`, o raio é
  derivado de `sqrt(lucro)` normalizado no intervalo `[7, 48]`, para que a área
  represente proporcionalmente o lucro (prejuízos usam o raio mínimo).
- **Regressão OLS** (`linearRegression`): mínimos quadrados para retas de
  tendência; exige ≥ 2 pontos válidos e denom ≠ 0.
- **Ordenação de 3 estados** (`useTable`): desc → asc → nenhum → desc...; no
  estado "nenhum", retorna a ordem natural dos dados filtrados.
- **Busca tolerante** (`useTable`): normaliza título e consulta (sem acentos,
  minúsculas) antes de comparar.

---

## 10. Variáveis de Ambiente

| Variável         | Padrão | Descrição |
|------------------|--------|-----------|
| `TRUSTED_CSV_PATH` | `../dados/processados/cinematografia_analytics_trusted.csv` | Caminho do CSV Trusted servido pela API |

Sem *secrets* no frontend. A chave do TMDB pertence exclusivamente ao pipeline
Python.

---

## 11. Como Executar

A partir da pasta `frontend/`:

```bash
# Instalar dependências
npm install

# Ambiente de desenvolvimento (http://localhost:3000)
npm run dev

# Build de produção
npm run build && npm start

# Lint
npm run lint
```

> **Pré-requisito:** a base Trusted deve existir em `dados/processados/`. Caso
> contrário, a rota `/api/movies` retorna 404 com instrução para executar o
> pipeline Python (`python main.py` na raiz do projeto).

---

## 12. Decisões Técnicas Relevantes

- **App Router** em vez de Pages Router: rotas de API e páginas coexistem, e o
  *layout* compartilhado (Navbar + Providers) é declarativo.
- **Cache em memória na rota de API**: o CSV é lido e convertido uma única vez
  por processo — suficiente para uma fonte estática que só muda ao re-rodar o
  pipeline.
- **`notMerge` + `lazyUpdate` no ECharts**: garante transições limpas ao trocar
  de opção sem acumular estado interno do gráfico.
- **TypeScript estrito**: previne categorias inteiras de *bugs* em manipulação de
  dados tipados (`Movie`).

---

*Documento mantido pela equipe do projeto Cinema Analytics. Alterações na
arquitetura de páginas, componentes ou fluxo de dados devem ser refletidas neste
arquivo para manter a consistência com a implementação.*
