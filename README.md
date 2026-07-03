# Cinema Analytics — Análise Financeira do Cinema (2006–2026)

Projeto acadêmico de análise de dados cinematográficos que investiga o
**desempenho financeiro** de filmes lançados entre 2006 e 2026. O sistema coleta
dados do **TMDB** (The Movie Database), ajusta valores pelo **CPI-U** (Bureau of
Labor Statistics) para remover o efeito da inflação e apresenta os resultados em
um **dashboard interativo** construído em Next.js + ECharts.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Instalação — Passo a Passo](#3-instalação--passo-a-passo)
4. [Executando o Pipeline de Dados (Python)](#4-executando-o-pipeline-de-dados-python)
5. [Executando o Dashboard (Frontend)](#5-executando-o-dashboard-frontend)
6. [Estrutura do Projeto](#6-estrutura-do-projeto)
7. [Documentação Técnica](#7-documentação-técnica)
8. [Solução de Problemas](#8-solução-de-problemas)

---

## 1. Visão Geral

O projeto é dividido em **dois componentes independentes**:

| Componente | Tecnologia | Função |
|---|---|---|
| **Pipeline de Dados** | Python 3.13 + Pandas + Pandera | Extrai filmes do TMDB, ajusta pela inflação via CPI-U (API BLS) e gera o dataset analítico (padrão *medalha*: Bronze → Trusted) |
| **Dashboard** | Next.js 14 + ECharts + Tailwind CSS | Consome o dataset Trusted e exibe gráficos interativos respondendo a 10 perguntas de negócio |

```
TMDB API ──► raspagem (Bronze)
                                ├──► ETL + CPI/BLS ──► Trusted CSV ──► Dashboard Next.js
BLS API   ──► CPI-U (inflação) ─┘
```

> **Importante:** O repositório **já inclui** os dados processados
> (`dados/processados/cinematografia_analytics_trusted.csv` com ~2.501 filmes).
> Se você só quer **ver o dashboard funcionando**, pode pular a execução do
> pipeline e ir direto para a seção [5. Executando o Dashboard](#5-executando-o-dashboard-frontend).

---

## 2. Pré-requisitos

### 2.1 Git

Necessário para clonar o repositório.

- **Windows:** baixe em <https://git-scm.com/download/win>
- **macOS:** `brew install git` (ou instale o Xcode Command Line Tools)
- **Linux (Debian/Ubuntu):** `sudo apt install git`

Verifique a instalação:

```bash
git --version
```

### 2.2 Python 3.13+ (apenas para o pipeline)

O pipeline exige **Python 3.13 ou superior** (usa recursos modernos da linguagem).

- **Windows:** baixe o instalador em <https://www.python.org/downloads/> e marque
  a opção **"Add Python to PATH"** durante a instalação.
- **macOS:** `brew install python@3.13`
- **Linux (Debian/Ubuntu):** compile a partir do source ou use
  [pyenv](https://github.com/pyenv/pyenv)

Verifique a instalação:

```bash
python --version
# ou em alguns sistemas: python3 --version
```

### 2.3 Node.js 18+ e npm (para o dashboard)

O frontend exige **Node.js versão 18 ou superior** (recomendado 20+). O `npm`
vem junto na instalação do Node.

- **Windows:** baixe o instalador LTS em <https://nodejs.org/>
- **macOS:** `brew install node`
- **Linux (Debian/Ubuntu):** siga as instruções em
  <https://github.com/nodesource/distributions>

Verifique a instalação:

```bash
node --version   # deve mostrar v18.x.x ou superior
npm --version
```

### 2.4 Chave de API do TMDB (apenas para executar o pipeline)

Se você pretende **executar o pipeline de coleta de dados** (não apenas ver o
dashboard), é necessária uma chave gratuita do TMDB:

1. Acesse <https://www.themoviedb.org/> e crie uma conta gratuita.
2. Vá em **Configurações → API** (<https://www.themoviedb.org/settings/api>).
3. Solicite uma **API Key** (opção Developer).
4. Guarde a **API Key (v3 auth)** — uma string de 32 caracteres.

> A chave da API BLS (inflação) é **opcional**. Sem ela, o pipeline usa a API
> gratuita do BLS (limite menor) ou um fallback estático de CPI.

---

## 3. Instalação — Passo a Passo

### Passo 1: Clonar o repositório

```bash
git clone https://github.com/<usuario>/analise_filmes.git
cd analise_filmes
```

### Passo 2: Configurar o ambiente Python

Crie e ative um **ambiente virtual** (recomendado para isolar dependências):

**Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

> Se o PowerShell bloquear a execução do script, rode:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

Instale as dependências do Python:

```bash
pip install -r requirements.txt
```

### Passo 3: Configurar as variáveis de ambiente (`.env`)

Na **raiz do projeto**, copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e preencha com sua chave do TMDB:

```env
TMDB_API_KEY=sua_chave_de_32_caracteres_aqui

# (Opcional) Chave do BLS para mais consultas diárias de CPI
BLS_API_KEY=
```

### Passo 4: Instalar as dependências do Frontend

Entre na pasta do frontend e instale os pacotes:

```bash
cd frontend
npm install
cd ..
```

---

## 4. Executando o Pipeline de Dados (Python)

> **Pule esta seção** se só quer ver o dashboard — os dados já estão incluídos
> no repositório em `dados/processados/`.

O pipeline tem **duas fases** executadas em sequência:

1. **Raspagem (Bronze):** descobre e enriquece filmes do TMDB ano a ano.
2. **ETL (Trusted):** valida, deduplica, ajusta pela inflação (CPI-U) e calcula
   métricas derivadas (lucro real, ROI real, etc.).

### Execução completa (raspagem + ETL)

Na raiz do projeto, com o ambiente virtual ativado:

```bash
python main.py
```

Isso executa o pipeline padrão: filmes de 2006 a 2026, com no mínimo 1.000
votos, exigindo dados financeiros (budget e revenue) preenchidos.

### Opções de linha de comando

```bash
python main.py --help
```

| Opção | Padrão | Descrição |
|---|---|---|
| `--skip-raspagem` | — | Pula a fase de coleta e reutiliza o Bronze existente (útil para repetir só o ETL) |
| `--ano-inicio` | 2006 | Ano inicial da busca |
| `--ano-fim` | 2026 | Ano final da busca |
| `--votos` | 1000 | Número mínimo de votos (`vote_count.gte`) |
| `--max-paginas` | 500 | Limite de páginas por ano (TMDB aceita no máximo 500) |
| `--sem-filtro-financeiro` | — | Mantém filmes sem budget/revenue preenchidos |
| `-v` / `--verbose` | — | Logs detalhados (debug) |

**Exemplos:**

```bash
# Pipeline completo
python main.py

# Só o ETL (reutiliza dados já coletados)
python main.py --skip-raspagem

# Raspagem reduzida para teste rápido
python main.py --ano-inicio 2020 --ano-fim 2024 --max-paginas 20 -v
```

### Resultado

Ao final, dois arquivos CSV são gerados:

| Arquivo | Camada | Descrição |
|---|---|---|
| `dados/brutos/tmdb_filmes_financeiro.csv` | **Bronze** | Dados crus extraídos do TMDB |
| `dados/processados/cinematografia_analytics_trusted.csv` | **Trusted** | Dados validados, ajustados pela inflação e enriquecidos com métricas calculadas |

Os logs são salvos em `logs/pipeline.log`.

---

## 5. Executando o Dashboard (Frontend)

### Passo 1: Entrar na pasta do frontend

```bash
cd frontend
```

### Passo 2: Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

O terminal exibirá algo como:

```
  ▲ Next.js 14.x.x
  - Local:   http://localhost:3000
```

### Passo 3: Abrir no navegador

Acesse: **<http://localhost:3000>**

O dashboard redireciona automaticamente para a página **Análise por Gênero**.

### Páginas disponíveis

| Rota | Conteúdo |
|---|---|
| `/generos` | Evolução de ROI por gênero ao longo do tempo, heatmap Gênero × Orçamento, análise por duração e ranking de combinações (IDC) |
| `/filmes` | Dispersão Nota × Lucro e Runtime × ROI, com filtros interativos |
| `/tabela` | Tabela completa dos ~2.501 filmes com busca por nome e ordenação por coluna |

### Gerar a versão de produção (opcional)

```bash
npm run build
npm run start
```

---

## 6. Estrutura do Projeto

```
analise_filmes/
├── main.py                          # Entry point do pipeline (delegador)
├── requirements.txt                 # Dependências Python
├── .env.example                     # Template de variáveis de ambiente
├── .env                             # Suas chaves (NÃO versionado)
│
├── pipeline/                        # Pipeline de dados (Python)
│   ├── __init__.py                  # Constantes de caminho
│   ├── raspagem_tmdb.py             # Fase 1: extração (TMDB → Bronze)
│   ├── etl_consolidacao.py          # Fase 2: ETL + CPI/BLS (Bronze → Trusted)
│   └── orchestrator.py              # Orquestrador CLI (argparse)
│
├── dados/                           # Data lake (medalha: Bronze + Trusted)
│   ├── brutos/                      # Camada Bronze (CSV cru)
│   │   └── tmdb_filmes_financeiro.csv
│   └── processados/                 # Camada Trusted (CSV analítico)
│       └── cinematografia_analytics_trusted.csv
│
├── frontend/                        # Dashboard (Next.js + ECharts)
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/                     # Páginas (App Router)
│       │   ├── generos/page.tsx
│       │   ├── filmes/page.tsx
│       │   ├── tabela/page.tsx
│       │   └── api/movies/          # Rota que serve o CSV Trusted
│       ├── components/              # Componentes UI + gráficos ECharts
│       └── features/dashboard/      # Lógica: filtros, agregações, tipos
│
├── docs/                            # Documentação técnica
│   ├── pipeline.md                  # Referência completa do pipeline
│   ├── frontend.md                  # Referência do frontend
│   ├── dados.md                     # Dicionário de dados (Bronze + Trusted)
│   ├── streamlit_dashboard.md       # Dashboard legado (deprecated)
│   └── documento_tecnico.tex        # Documento acadêmico (LaTeX)
│
├── streamlit_dashboard/             # Dashboard antigo (DEPRECATED)
│   └── app_dashboard.py
│
└── logs/                            # Logs de execução do pipeline
    └── pipeline.log
```

---

## 7. Documentação Técnica

Documentos detalhados na pasta [`docs/`](./docs/):

| Documento | Conteúdo |
|---|---|
| [`pipeline.md`](./docs/pipeline.md) | Arquitetura, módulos, schemas, CLI, tratamento de erros |
| [`frontend.md`](./docs/frontend.md) | Stack, estrutura, fluxo de dados, design system |
| [`dados.md`](./docs/dados.md) | Dicionário de dados: colunas, fórmulas, contratos |
| [`documento_tecnico.tex`](./docs/documento_tecnico.tex) | Documento acadêmico formal (LaTeX) |

---

## 8. Solução de Problemas

### "TMDB_API_KEY não encontrada"

O arquivo `.env` não foi criado ou a chave está vazia. Veja o
[Passo 3](#passo-3-configurar-as-variáveis-de-ambiente-env).

### Erro "401 Unauthorized" ao raspar dados do TMDB

A chave do TMDB pode estar incorreta ou desativada. Verifique em
<https://www.themoviedb.org/settings/api>. O pipeline faz retries automáticos;
erros pontuais durante a raspagem são normais (rate-limit) e o processo continua.

### `pip install` falha no Windows

Certifique-se de que o Python foi adicionado ao PATH durante a instalação.
Tente usar `python -m pip install -r requirements.txt` em vez de `pip` direto.

### `npm install` ou `npm run dev` falha

Verifique se a versão do Node.js é 18+ (`node --version`). Se o problema
persistir, tente remover a pasta `frontend/node_modules` e o arquivo
`frontend/package-lock.json`, depois rode `npm install` novamente.

### O dashboard abre mas não mostra dados

Confirme que o arquivo
`dados/processados/cinematografia_analytics_trusted.csv` existe e não está vazio.
O frontend lê este arquivo por padrão. Se precisar apontar para outro caminho,
defina a variável de ambiente `TRUSTED_CSV_PATH` antes de rodar `npm run dev`.

### O PowerShell bloqueia a ativação do ambiente virtual

Rode o comando abaixo para liberar a execução de scripts localmente:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Dashboard Streamlit (legado)

O dashboard antigo em Streamlit foi **descontinuado** e substituído pelo frontend
Next.js. Se quiser executá-lo por histórico:

```bash
streamlit run streamlit_dashboard/app_dashboard.py
```
