# Cinema Analytics — Análise Financeira do Cinema (2006–2026)

Projeto acadêmico de análise de dados cinematográficos que investiga o
**desempenho financeiro** de filmes lançados entre 2006 e 2026. O sistema coleta
dados do **TMDB** (The Movie Database), ajusta valores pelo **CPI-U** (Bureau of
Labor Statistics) para remover o efeito da inflação e apresenta os resultados em
um **dashboard interativo** construído em Next.js + ECharts.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Requisitos do Sistema](#2-requisitos-do-sistema)
3. [Como Rodar o Dashboard (Recomendado)](#3-como-rodar-o-dashboard-recomendado)
4. [Como Rodar o Pipeline de Dados (Opcional)](#4-como-rodar-o-pipeline-de-dados-opcional)
5. [Estrutura do Projeto](#5-estrutura-do-projeto)
6. [Documentação Técnica](#6-documentação-técnica)
7. [Solução de Problemas](#7-solução-de-problemas)

---

## 1. Visão Geral

O projeto tem **dois componentes independentes**:

| Componente | Tecnologia | Função |
|---|---|---|
| **Pipeline de Dados** | Python 3.13 + Pandas + Pandera | Extrai filmes do TMDB, ajusta pela inflação via CPI-U (API BLS) e gera o dataset analítico |
| **Dashboard** | Next.js 14 + ECharts + Tailwind CSS | Exibe gráficos interativos respondendo a 10 perguntas de negócio |

```
TMDB API ──► raspagem (Bronze)
                                ├──► ETL + CPI/BLS ──► Trusted CSV ──► Dashboard Next.js
BLS API   ──► CPI-U (inflação) ─┘
```

> **Para avaliar o projeto, basta rodar o Dashboard** (Seção 3). O repositório
> já inclui os dados processados (~2.501 filmes). O Pipeline (Seção 4) só é
> necessário se quiser **recoletar** os dados do zero.

---

## 2. Requisitos do Sistema

A tabela abaixo mostra o que cada componente precisa. **Se você só vai rodar o
dashboard, ignore os requisitos marcados como "Pipeline".**

| Requisito | Dashboard | Pipeline | Onde obter |
|---|:---:|:---:|---|
| **Git** | ✅ | ✅ | <https://git-scm.com/downloads> |
| **Node.js 18+** (com npm) | ✅ | — | <https://nodejs.org/> (versão LTS) |
| **Python 3.13+** | — | ✅ | <https://www.python.org/downloads/> |
| **Chave de API do TMDB** | — | ✅ | <https://www.themoviedb.org/settings/api> (gratuita) |

### Instalando o Git

- **Windows:** baixe o instalador em <https://git-scm.com/download/win> e avance
  com as opções padrão.
- **macOS:** `brew install git` ou instale o Xcode Command Line Tools.
- **Linux:** `sudo apt install git`

Verifique: `git --version`

### Instalando o Node.js (necessário para o Dashboard)

- **Windows:** baixe o instalador **LTS** em <https://nodejs.org/> e avance com
  as opções padrão.
- **macOS:** `brew install node`
- **Linux:** siga <https://github.com/nodesource/distributions>

Verifique:

```bash
node --version   # deve mostrar v18.x.x ou superior
npm --version
```

### Instalando o Python 3.13+ (necessário apenas para o Pipeline)

- **Windows:** baixe em <https://www.python.org/downloads/> e marque a opção
  **"Add Python to PATH"** durante a instalação.
- **macOS:** `brew install python@3.13`
- **Linux:** compile a partir do source ou use
  [pyenv](https://github.com/pyenv/pyenv)

Verifique: `python --version` (ou `python3 --version`)

---

## 3. Como Rodar o Dashboard (Recomendado)

> **Pré-requisito:** [Git](#instalando-o-git) + [Node.js 18+](#instalando-o-nodejs-necessário-para-o-dashboard).
> Não é necessário instalar Python nem obter chaves de API.

Esta seção é **autossuficiente** — siga os passos em ordem e o dashboard estará
no ar.

### Passo 1 — Clonar o repositório

```bash
git clone https://github.com/<usuario>/analise_filmes.git
cd analise_filmes
```

### Passo 2 — Instalar as dependências do frontend

```bash
cd frontend
npm install
```

Isso baixa todos os pacotes necessários (Next.js, ECharts, Tailwind, etc.).
Pode levar 1 a 3 minutos na primeira vez.

### Passo 3 — Iniciar o servidor

```bash
npm run dev
```

O terminal exibirá:

```
  ▲ Next.js 14.x.x
  - Local:   http://localhost:3000
```

### Passo 4 — Abrir no navegador

Acesse: **<http://localhost:3000>**

O dashboard redireciona automaticamente para a página **Análise por Gênero**.

### Páginas disponíveis

| Rota | Conteúdo |
|---|---|
| `/generos` | Evolução de ROI por gênero, heatmap Gênero × Orçamento, análise por duração e ranking de combinações (IDC) |
| `/filmes` | Dispersão Nota × Lucro e Runtime × ROI, com filtros interativos |
| `/tabela` | Tabela completa dos ~2.501 filmes com busca por nome e ordenação por coluna |

### Versão de produção (opcional)

Caso prefira rodar a build otimizada em vez do modo de desenvolvimento:

```bash
npm run build
npm run start
```

---

## 4. Como Rodar o Pipeline de Dados (Opcional)

> **Pré-requisito:** [Git](#instalando-o-git) + [Python 3.13+](#instalando-o-python-313-necessário-apenas-para-o-pipeline) + [Chave de API do TMDB](#chave-de-api-do-tmdb).
>
> **Pule esta seção** se só quer ver o dashboard. Os dados já estão incluídos
> no repositório em `dados/processados/`.

Esta seção é **autossuficiente** — cobre desde a configuração do ambiente Python
até a execução completa.

### Passo 1 — Clonar o repositório (se ainda não fez)

```bash
git clone https://github.com/<usuario>/analise_filmes.git
cd analise_filmes
```

### Passo 2 — Criar e ativar o ambiente virtual Python

**Windows (PowerShell):**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

> Se o PowerShell bloquear a execução do script, rode primeiro:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**macOS / Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Passo 3 — Instalar as dependências

```bash
pip install -r requirements.txt
```

### Passo 4 — Configurar a chave de API (`.env`)

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Edite o arquivo `.env` na raiz do projeto e cole sua chave do TMDB:

```env
TMDB_API_KEY=sua_chave_de_32_caracteres_aqui

# (Opcional) Chave do BLS para mais consultas de CPI por dia
BLS_API_KEY=
```

### Passo 5 — Executar o pipeline

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
| `--skip-raspagem` | — | Pula a coleta e reutiliza o Bronze existente |
| `--ano-inicio` | 2006 | Ano inicial da busca |
| `--ano-fim` | 2026 | Ano final da busca |
| `--votos` | 1000 | Número mínimo de votos |
| `--max-paginas` | 500 | Limite de páginas por ano |
| `--sem-filtro-financeiro` | — | Mantém filmes sem budget/revenue |
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
| `dados/processados/cinematografia_analytics_trusted.csv` | **Trusted** | Dados validados, ajustados pela inflação e enriquecidos |

Os logs são salvos em `logs/pipeline.log`.

---

## 5. Estrutura do Projeto

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
│   └── documento_tecnico.tex        # Documento acadêmico (LaTeX)
│
└── logs/                            # Logs de execução do pipeline
    └── pipeline.log
```

---

## 6. Documentação Técnica

Documentos detalhados na pasta [`docs/`](./docs/):

| Documento | Conteúdo |
|---|---|
| [`pipeline.md`](./docs/pipeline.md) | Arquitetura, módulos, schemas, CLI, tratamento de erros |
| [`frontend.md`](./docs/frontend.md) | Stack, estrutura, fluxo de dados, design system |
| [`dados.md`](./docs/dados.md) | Dicionário de dados: colunas, fórmulas, contratos |
| [`documento_tecnico.tex`](./docs/documento_tecnico.tex) | Documento acadêmico formal (LaTeX) |

---

## 7. Solução de Problemas

### `npm install` ou `npm run dev` falha

Verifique se a versão do Node.js é 18+ (`node --version`). Se o problema
persistir, remova a pasta `frontend/node_modules` e o arquivo
`frontend/package-lock.json`, depois rode `npm install` novamente.

### O dashboard abre mas não mostra dados

Confirme que o arquivo
`dados/processados/cinematografia_analytics_trusted.csv` existe e não está vazio.
O frontend lê este arquivo por padrão.

### O PowerShell bloqueia a ativação do ambiente virtual

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### `pip install` falha no Windows

Certifique-se de que o Python foi adicionado ao PATH durante a instalação.
Tente: `python -m pip install -r requirements.txt`

### "TMDB_API_KEY não encontrada" (Pipeline)

O arquivo `.env` não foi criado ou a chave está vazia. Veja o
[Passo 4 da Seção 4](#passo-4--configurar-a-chave-de-api-env).

### Erro "401 Unauthorized" ao raspar dados do TMDB (Pipeline)

A chave pode estar incorreta ou desativada. Verifique em
<https://www.themoviedb.org/settings/api>. O pipeline faz retries automáticos;
erros pontuais durante a raspagem são normais (rate-limit) e o processo continua.
