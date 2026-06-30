# Dados — Camadas Bronze e Trusted

> Documento oficial de referência sobre o **repositório de dados** do projeto
> **Cinema Analytics**. Descreve a organização das camadas, os esquemas de cada
> artefato e o contrato entre o pipeline (produtor) e o frontend (consumidor).

---

## 1. Visão Geral

A pasta `dados/` é o **data lake** do projeto, organizada em duas camadas
lógicas (padrão *medallion* simplificado). Cada camada corresponde a um estágio
de maturidade dos dados:

```
dados/
├── brutos/        # Camada Bronze — extração bruta da fonte
└── processados/   # Camada Trusted — dados tratados, validados e enriquecidos
```

| Camada | Diretório | Produtor | Consumidor |
|---|---|---|---|
| **Bronze** | `dados/brutos/` | `pipeline/raspagem_tmdb.py` | `pipeline/etl_consolidacao.py` |
| **Trusted** | `dados/processados/` | `pipeline/etl_consolidacao.py` | Frontend Next.js (somente leitura) |

> A Trusted é a **única** base exposta à camada de visualização. A Bronze é um
> intermediário interno.

---

## 2. Camada Bronze — `tmdb_filmes_financeiro.csv`

### 2.1 Origem
Extraída da API pública do TMDB (`/discover/movie` + `/movie/{id}`) pelo módulo
`pipeline/raspagem_tmdb.py`. Contém os dados no estado em que chegam da fonte,
exceto por:
- Filtro de relevância: `vote_count ≥ vote_count_min`.
- Filtro de integridade: `budget > 0` **e** `revenue > 0`.
- Deduplicação por `tmdb_id`.

### 2.2 Esquema

| Coluna            | Tipo    | Descrição                              |
|-------------------|---------|----------------------------------------|
| `tmdb_id`         | int     | Identificador único no TMDB (PK)       |
| `imdb_id`         | string  | Identificador no IMDb (pode ser nulo)  |
| `title`           | string  | Título do filme                        |
| `release_date`    | string  | Data de estreia (`YYYY-MM-DD`)         |
| `runtime`         | int     | Duração em minutos                     |
| `budget_nominal`  | int     | Orçamento em valor nominal (USD)       |
| `revenue_nominal` | int     | Receita em valor nominal (USD)         |
| `genre_primary`   | string  | Gênero principal                       |
| `genre_secondary` | string  | Gênero secundário                      |
| `vote_average`    | float   | Nota média (0–10)                      |
| `vote_count`      | int     | Número de votos                        |

> A validação contratual é aplicada no ETL (`SCHEMA_BRONZE`, pandera), não no
> momento da gravação.

---

## 3. Camada Trusted — `cinematografia_analytics_trusted.csv`

### 3.1 Origem
Produzida por `pipeline/etl_consolidacao.py` a partir da Bronze. Aplica:
1. Validação + deduplicação da Bronze (`SCHEMA_BRONZE`).
2. Extração do ano de lançamento.
3. Junção com a tabela de CPI (fonte BLS) por `ano_lancamento`.
4. Cálculo dos indicadores reais (ajustados por inflação, base 2026).
5. Validação final (`SCHEMA_TRUSTED`).

### 3.2 Esquema

Herdá todas as colunas da Bronze e adiciona as colunas analíticas:

| Coluna              | Tipo   | Descrição                                        |
|---------------------|--------|--------------------------------------------------|
| `ano_lancamento`    | int    | Ano extraído de `release_date`                   |
| `cpi_medio`         | float  | CPI médio anual (BLS)                            |
| `fator_deflator`    | float  | `CPI_2026 / CPI_ano`                             |
| `budget_real`       | float  | Orçamento em valor de 2026                       |
| `revenue_real`      | float  | Receita em valor de 2026                         |
| `lucro_real`        | float  | `revenue_real − budget_real`                     |
| `roi_real`          | float  | `lucro_real / budget_real`                       |
| `superou_orcamento` | bool   | `revenue_real > budget_real` (assertividade)     |

### 3.3 Fórmulas de Cálculo

| Indicador          | Fórmula                                  |
|--------------------|------------------------------------------|
| `fator_deflator`   | `CPI_2026 / CPI_ano_lancamento`          |
| `budget_real`      | `budget_nominal × fator_deflator`        |
| `revenue_real`     | `revenue_nominal × fator_deflator`       |
| `lucro_real`       | `revenue_real − budget_real`             |
| `roi_real`         | `lucro_real / budget_real`               |
| `superou_orcamento`| `revenue_real > budget_real`             |

> **Base de inflação:** 2026 (último ano da série CPI). O ajuste torna
> comparações entre anos distintas consistentes em poder de compra.

---

## 4. Volume e Comportamento dos Dados

- O volume final varia conforme o recorte definido nos parâmetros da raspagem
  (`--votos`, intervalo de anos). Os valores correntes estão registrados no log
  da última execução (`logs/pipeline.log`).
- **Outlier real conhecido:** *Paranormal Activity* (2007) — orçamento de ~$15k
  com receita elevada, gerando ROI extremo (~1,29M%). Não é erro: é um
  fenômeno real do Horror independente. A escala logarítmica nos gráficos
  temporais mitiga sua distorção visual.
- **Atributos nulos:** `imdb_id`, `runtime`, `genre_*`, `vote_*` podem ser
  nulos na fonte e são tratados pela validação (`nullable`) ou por *defaults*
  no frontend (ex.: gênero `"N/A"`).

---

## 5. Contrato Pipeline ↔ Frontend

| Aspecto | Convenção |
|---|---|
| Formato do arquivo | CSV (UTF-8, sem BOM), cabeçalho na primeira linha |
| Codificação | UTF-8 |
| Caminho consumido | `dados/processados/cinematografia_analytics_trusted.csv` |
| Leitor | `frontend/src/app/api/movies/route.ts` (Node `fs` + PapaParse) |
| Conversão de tipos | feita na rota de API (`toNumber`, *boolean* via `String === "true"`) |
| Sobrescrita de caminho | variável `TRUSTED_CSV_PATH` (frontend) |

> **Regra de ouro:** o frontend **não** deve escrever nesta pasta. Toda
> alteração da base é de responsabilidade exclusiva do pipeline Python.

---

## 6. Versionamento e Segurança

- Os diretórios `dados/brutos/` e `dados/processados/` **podem** ser versionados
  (as linhas de `gitignore` que os bloqueiam estão comentadas) para servir de
  amostra e garantir reprodutibilidade — desde que não contenham *secrets*.
- Nenhum dado sensível é armazenado aqui: a única credencial do projeto
  (`TMDB_API_KEY`) vive em `.env` na raiz, gitignorada.

---

## 7. Regeneração da Base

Para reconstruir integralmente as camadas, a partir da raiz do projeto:

```bash
python main.py              # extrai (Bronze) + transforma (Trusted)
python main.py --skip-raspagem   # regenera apenas a Trusted a partir da Bronze
```

Detalhes completos dos parâmetros e do fluxo estão em [`docs/pipeline.md`](./pipeline.md).

---

*Documento mantido pela equipe do projeto Cinema Analytics. Alterações nos
esquemas ou no contrato de consumo devem ser refletidas aqui e no código
produtor/consumidor correspondente.*
