# Pipeline de Dados — Cinema Analytics

> Documento oficial de referência técnica do pipeline de aquisição, tratamento e
> consolidação de dados do projeto **Cinema Analytics**. Destina-se à equipe de
> desenvolvimento e análise para compreensão da arquitetura, dos módulos, das
> regras de negócio e dos procedimentos de execução.

---

## 1. Visão Geral

O pipeline é responsável por **adquirir** dados cinematográficos da API pública
do TMDB (*The Movie Database*), **tratá-los** (validação, deduplicação,
normalização monetária por inflação) e **consolidá-los** em uma base analítica
pronta para consumo pela camada de visualização (frontend Next.js + ECharts).

O processamento é organizado em **duas camadas lógicas**, inspiradas no padrão
*medallion*:

| Camada   | Função                                            | Artefato                                 |
|----------|---------------------------------------------------|------------------------------------------|
| **Bronze** | Dados brutos extraídos da fonte, mínima transformação | `dados/brutos/tmdb_filmes_financeiro.csv` |
| **Trusted** | Dados limpos, validados e enriquecidos com indicadores | `dados/processados/cinematografia_analytics_trusted.csv` |

> A camada de visualização (frontend) é tratada como um consumidor **somente
> leitura** da camada Trusted e não faz parte deste pacote.

---

## 2. Estrutura de Diretórios

```
analise_filmes/
├── main.py                     # Entry point raiz (delega ao orquestrador)
├── pipeline/                   # ← Pacote deste documento
│   ├── __init__.py             # Constantes de caminho centralizadas
│   ├── raspagem_tmdb.py        # Fase 1 — Extração (camada Bronze)
│   ├── etl_consolidacao.py     # Fase 2 — Transformação (camada Trusted)
│   └── orchestrator.py         # Orquestração + interface de linha de comando
├── dados/
│   ├── brutos/                 # Saída da Bronze (CSV)
│   └── processados/            # Saída da Trusted (CSV consumido pelo frontend)
├── logs/
│   └── pipeline.log            # Log de execução rotativo (UTF-8)
├── .env / .env.example         # Secrets (TMDB_API_KEY) — .env é gitignorado
└── requirements.txt            # Dependências Python
```

As constantes de caminho são centralizadas em `pipeline/__init__.py`, calculadas
relativamente à raiz do projeto. Isso garante que o pipeline funcione
independentemente do diretório a partir do qual for invocado:

```python
PROJECT_ROOT    = <raiz do projeto>
DADOS_DIR       = PROJECT_ROOT / "dados"
BRUTOS_DIR      = DADOS_DIR / "brutos"
PROCESSADOS_DIR = DADOS_DIR / "processados"
LOG_DIR         = PROJECT_ROOT / "logs"
```

---

## 3. Módulos

### 3.1 `pipeline/__init__.py`
Define o pacote e expõe as constantes de caminho listadas acima. Não contém
lógica de negócio.

### 3.2 `pipeline/raspagem_tmdb.py` — Fase de Extração (Bronze)

Responsável pela comunicação com a API do TMDB e pela geração do arquivo Bronze.

**Endpoints utilizados:**

| Endpoint | Função |
|---|---|
| `GET /discover/movie` | Descoberta de filmes por intervalo de datas e filtros |
| `GET /movie/{id}` | Detalhamento individual (orçamento, receita, gêneros, nota) |

**Estratégia de aquisição (duas etapas):**

1. **Descoberta de IDs** (`extrair_lista_ids`): varre o endpoint `/discover`
   **fatiando por ano** (`primary_release_date.gte`/`.lte`). O fatiamento por ano
   é deliberado — ele contorna o teto de **10.000 resultados por consulta**
   imposto pelo TMDB, permitindo mapear praticamente toda a filmografia do
   intervalo. A paginação é **dinâmica**: na primeira página de cada ano lê-se o
   campo `total_pages` real e ajusta-se o limite respeitando o teto absoluto de
   **500 páginas** do TMDB.
2. **Enriquecimento** (`enriquecer_dados_financeiros`): para cada ID coletado,
   consulta `/movie/{id}` e extrai orçamento, receita, gêneros e nota. Aplica o
   **filtro de qualidade de dados**: descarta títulos sem `budget > 0` **e**
   `revenue > 0` (necessário para o cálculo de ROI/Lucro). Este filtro é
   controlável via parâmetro `exigir_financeiros`.

**Tratamento de limite de taxa (rate-limit):**

O TMDB limita rajadas (~20 requisições / 10s). Em picos, a API responde `401
"invalid key"` (mensagem enganosa que mascara um *throttle* transitório) ou
`429`. A função `_get_com_retry` implementa **retry com *backoff* linear** (até 4
tentativas, espera crescente) para ambos os códigos, além de tratar erros de
rede (`RequestException`). Há atrasos deliberados entre chamadas:
`DELAY_DISCOVER = 0,25s` e `DELAY_DETAILS = 0,05s`.

**Deduplicação:** feita em dois níveis — IDs descobertos (`dict.fromkeys`,
preservando ordem) e registros no DataFrame final (`drop_duplicates` por
`tmdb_id`).

**Ponto de entrada:** `executar_raspagem(...)` orquestra as duas etapas e grava o
CSV Bronze.

### 3.3 `pipeline/etl_consolidacao.py` — Fase de Transformação (Trusted)

Responsável por ler a Bronze, validar, enriquecer e produzir a Trusted.

**Etapas de processamento:**

1. **Leitura** do CSV Bronze.
2. **Validação e deduplicação da Bronze** (`_validar_e_deduplicar_bronze`):
   deduplica por `tmdb_id`, remove nulos em campos essenciais e aplica o
   `SCHEMA_BRONZE` (pandera) com `lazy=True` (acumula todas as violações antes de
   falhar).
3. **Extração do ano** a partir de `release_date` (via `pd.to_datetime`).
4. **Junção com a tabela de CPI** (Consumer Price Index, fonte BLS) por
   `ano_lancamento`. A base de referência é **2026**.
5. **Cálculo dos indicadores reais (ajustados por inflação):**

   | Indicador | Fórmula |
   |---|---|
   | `fator_deflator` | `CPI_2026 / CPI_ano` |
   | `budget_real` | `budget_nominal × fator_deflator` |
   | `revenue_real` | `revenue_nominal × fator_deflator` |
   | `lucro_real` | `revenue_real − budget_real` |
   | `roi_real` | `lucro_real / budget_real` |
   | `superou_orcamento` | `revenue_real > budget_real` |

6. **Validação da Trusted** via `SCHEMA_TRUSTED` (pandera).
7. **Persistência** do CSV Trusted.
8. **Checkpoint de KPIs** (`_logar_kpis`): registra no log os três KPIs oficiais
   do projeto (ROI médio, taxa de assertividade, receita média por filme) e
   confronta-os com as metas definidas.

**Tabela de CPI:** a série histórica (2006–2026) é embutida em
`carregar_tabela_cpi`, com valores médios anuais oficiais do *U.S. Bureau of
Labor Statistics* (BLS). O `fator_deflator` converte valores nominais de
qualquer ano para o poder de compra de 2026, tornando comparações
interanuais consistentes.

### 3.4 `pipeline/orchestrator.py` — Orquestração

Coordena a execução sequencial das fases, gerencia o **logging** (console +
arquivo `logs/pipeline.log`) e expõe a **interface de linha de comando** (CLI)
através do `argparse`.

Fluxo orquestrado (`orquestrar`):

1. **Fase 1 — Extração (Bronze):** invoca `executar_raspagem`. Pode ser omitida
   com `--skip-raspagem` (reaproveita a Bronze existente).
2. **Fase 2 — Transformação (Trusted):** invoca `executar_pipeline_etl`.
3. **Fase 3 — Visualização:** executada separadamente no frontend Next.js
   (consome a Trusted gerada).

Cada fase retorna um código de saída; uma falha em qualquer fase aborta o
pipeline com código `1`.

### 3.5 `main.py` — Entry Point Raiz

Arquivo fino na raiz do projeto que apenas delega ao orquestrador
(`pipeline.orchestrator.main`). É o ponto de invocação padrão do pipeline.

---

## 4. Esquema de Dados

### 4.1 Camada Bronze — `tmdb_filmes_financeiro.csv`

| Coluna             | Tipo    | Restrições (pandera)              |
|--------------------|---------|-----------------------------------|
| `tmdb_id`          | int     | `≥ 1`, não nulo, **único**        |
| `imdb_id`          | string  | anulável                          |
| `title`            | string  | não nulo                          |
| `release_date`     | string  | não nulo                          |
| `runtime`          | int     | `≥ 0`, anulável                   |
| `budget_nominal`   | int     | `> 0`, não nulo                   |
| `revenue_nominal`  | int     | `> 0`, não nulo                   |
| `genre_primary`    | string  | anulável                          |
| `genre_secondary`  | string  | anulável                          |
| `vote_average`     | float   | `0–10`, anulável                  |
| `vote_count`       | int     | `≥ 0`, anulável                   |

### 4.2 Camada Trusted — `cinematografia_analytics_trusted.csv`

Herdá todas as colunas da Bronze e adiciona:

| Coluna              | Tipo   | Descrição                                   |
|---------------------|--------|---------------------------------------------|
| `ano_lancamento`    | int    | Extraído de `release_date` (`1900–2100`)    |
| `cpi_medio`         | float  | CPI médio anual (BLS)                       |
| `fator_deflator`    | float  | `> 0`, base 2026                            |
| `budget_real`       | float  | Orçamento em valor de 2026                  |
| `revenue_real`      | float  | Receita em valor de 2026                    |
| `lucro_real`        | float  | `revenue_real − budget_real`                |
| `roi_real`          | float  | `lucro_real / budget_real`                  |
| `superou_orcamento` | bool   | Indicador booleano de assertividade         |

> **Observação:** ambos os esquemas usam `strict=False` (permitem colunas
> adicionais) e `coerce=True` (forçam a conversão de tipos).

---

## 5. Regras de Negócio e Qualidade de Dados

- **Filtro de relevância:** `vote_count ≥ vote_count_min` (padrão `1000`),
  aplicado já no `/discover`, restringe a coleta a filmes com mínima
  popularidade.
- **Filtro de integridade financeira:** `budget > 0` **e** `revenue > 0`, para
  garantir ROI e Lucro significativos (desativável via `--sem-filtro-financeiro`,
  mediante avaliação — produzirá ROI/Lucro nulos).
- **Unicidade:** `tmdb_id` é chave primária; deduplicação aplicada na extração e
  revalidada no ETL.
- **Validação contratual:** *schemas* pandera em ambas as camadas; falhas
  abortam a execução e registram as violações no log.
- **Ajuste por inflação:** todos os valores monetários são normalizados para o
  poder de compra de 2026 via CPI, assegurando comparabilidade entre anos
  distintos.

---

## 6. KPIs de Saúde

Ao concluir a Trusted, o pipeline registra um *checkpoint* com os indicadores
oficiais do projeto e suas respectivas metas:

| KPI                       | Definição                                  | Meta       |
|---------------------------|--------------------------------------------|------------|
| ROI Real Médio            | Média de `roi_real` (×100)                 | `> 20%`    |
| Taxa de Assertividade     | % de filmes com `superou_orcamento = True` | `> 60%`    |
| Receita Real Média/Filme  | Média de `revenue_real` (em milhões)       | `> $50M`   |

> Os valores atuais constam no log da última execução
> (`logs/pipeline.log`). Eles variam conforme o recorte (intervalo de anos e
> limite de votos) definido nos parâmetros da raspagem.

---

## 7. Configuração de Ambiente

### 7.1 Dependências
Definidas em `requirements.txt`. Instalação:

```bash
pip install -r requirements.txt
```

| Pacote          | Versão  | Finalidade                          |
|-----------------|---------|-------------------------------------|
| `requests`      | 2.32.3  | Cliente HTTP para a API do TMDB     |
| `pandas`        | 2.2.3   | Manipulação tabular dos dados       |
| `python-dotenv` | 1.0.1   | Carregamento de variáveis do `.env` |
| `pandera`       | 0.22.0  | Validação de esquemas (Bronze/Trusted) |

> Requer **Python 3.13** (uso de *type hints* modernos e sintaxe `| None`).

### 7.2 Secrets
A chave de API do TMDB é lida da variável de ambiente `TMDB_API_KEY`, carregada a
partir do arquivo `.env` na raiz. **Este arquivo jamais é versionado** (bloqueado
em `.gitignore`). Para configurar:

1. Obtenha uma chave em <https://www.themoviedb.org/settings/api>.
2. Copie `.env.example` para `.env`.
3. Substitua o valor de `TMDB_API_KEY` pela sua chave.

A ausência da chave aborta a execução com mensagem orientativa.

---

## 8. Como Executar

Todos os comandos devem ser executados a partir da **raiz do projeto**.

### Execução completa (extração + transformação)
```bash
python main.py
```

### Apenas transformação (reaproveita a Bronze existente)
```bash
python main.py --skip-raspagem
```

### Recorte personalizado da coleta
```bash
python main.py --ano-inicio 2010 --ano-fim 2024 --votos 500
```

### Parâmetros da CLI

| Parâmetro                 | Padrão | Descrição                                                       |
|---------------------------|--------|-----------------------------------------------------------------|
| `--skip-raspagem`         | —      | Omitir a extração e usar a Bronze atual                         |
| `--ano-inicio`            | 2006   | Ano inicial do recorte                                         |
| `--ano-fim`               | 2026   | Ano final do recorte                                           |
| `--votos`                 | 1000   | `vote_count.gte`; reduzir (ex.: `100`) amplia o volume coletado |
| `--max-paginas`           | 500    | Teto de páginas do `/discover` por ano (limite do TMDB)         |
| `--sem-filtro-financeiro` | —      | Manter filmes sem `budget`/`revenue` (ROI/Lucro ficarão nulos)  |
| `-v`, `--verbose`         | —      | Habilitar logs de *debug*                                       |

> **Atenção:** reduzir `--votos` aumenta exponencialmente o tempo de execução,
> pois mais IDs serão enriquecidos individualmente via `/movie/{id}` (respeitando
> os limites de taxa do TMDB).

---

## 9. Logging

O logging é configurado pelo orquestrador com duplo destino:

- **Console** (`stdout`) — acompanhamento em tempo real.
- **Arquivo** — `logs/pipeline.log`, codificação UTF-8, modo acréscimo.

Formato padrão:
```
YYYY-MM-DD HH:MM:SS | LEVEL    | módulo | mensagem
```

O nível é `INFO` por padrão e `DEBUG` com `-v`. Cada módulo usa seu próprio
*logger* nomeado (`pipeline.raspagem_tmdb`, `pipeline.etl_consolidacao`,
`orchestrator`).

---

## 10. Tratamento de Erros

| Cenário                                | Comportamento                                              |
|----------------------------------------|------------------------------------------------------------|
| `TMDB_API_KEY` ausente                 | `RuntimeError` com instrução de configuração              |
| Erro de rede                           | *Retry* com *backoff* (até 4 tentativas)                  |
| HTTP 401/429 (limite de taxa)          | Espera crescente e re-tentativa                           |
| Outro HTTP de erro                     | Registrado e a página é descartada (execução prossegue)   |
| Violação de esquema pandera            | Exceção com detalhamento das falhas; pipeline aborta      |
| Bronze ausente com `--skip-raspagem`   | Aborto com código `1` e mensagem orientativa              |
| DataFrame final vazio                  | Aborto e log de erro                                       |

---

## 11. Artefatos de Saída

| Artefato | Local | Consumidor |
|---|---|---|
| Bronze  | `dados/brutos/tmdb_filmes_financeiro.csv`           | ETL (Trusted) |
| Trusted | `dados/processados/cinematografia_analytics_trusted.csv` | Frontend Next.js (somente leitura) |
| Log     | `logs/pipeline.log`                                  | Equipe (auditoria) |

A Trusted é a **única** base consumida pela camada de visualização. A Bronze é
um intermediário interno e não deve ser exposta ao frontend.

---

## 12. Fluxo Resumido

```
        TMDB API
           │
           ▼  (HTTP + retry/backoff)
┌─────────────────────┐   /discover (por ano) + /movie/{id}
│  raspagem_tmdb.py   │ ───────────────────────────────────► Bronze (CSV)
└─────────────────────┘                                          │
           ▲                                                     │ leitura
           │ invoca                                              ▼
┌─────────────────────┐                                  ┌───────────────────┐
│   orchestrator.py   │ ──► executa fases em ordem ────► │ etl_consolidacao  │
│   (CLI + logging)   │                                  │      .py          │
└─────────────────────┘                                  └─────────┬─────────┘
           ▲                                                       │ valida (pandera)
           │ entry point                                           │ + CPI + indicadores
┌─────────────────────┐                                            ▼
│       main.py       │                                    Trusted (CSV) ──► Frontend
└─────────────────────┘
```

---

*Documento mantido pela equipe do projeto Cinema Analytics. Alterações na
arquitetura de extração, transformação ou esquema de dados devem ser refletidas
neste arquivo para manter a consistência com a implementação.*
