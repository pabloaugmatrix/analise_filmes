import os
import time
import logging

import requests
import pandas as pd
from dotenv import load_dotenv

from pipeline import BRUTOS_DIR, PROJECT_ROOT

# ==============================================================================
# CONFIGURACAO DE LOGGING
# ==============================================================================
logger = logging.getLogger(__name__)

# ==============================================================================
# CARREGAMENTO DE SECRETS (.env)
# ==============================================================================
load_dotenv(PROJECT_ROOT / ".env")

URL_DISCOVER = "https://api.themoviedb.org/3/discover/movie"
URL_DETAILS = "https://api.themoviedb.org/3/movie/"

# Limites de seguranca contra rate-limit do TMDB (~20 req/10s).
# Em rajadas o TMDB responde 401 "invalid key" (enganoso) - por isso o retry.
DELAY_DISCOVER = 0.25  # entre paginas do /discover
DELAY_DETAILS = 0.05   # entre chamadas de /movie/{id}
TMDB_MAX_PAGINAS = 500  # teto absoluto do TMDB por consulta /discover


def _obter_api_key() -> str:
    """Le a TMDB_API_KEY do ambiente e aborta de forma clara se faltar."""
    api_key = os.getenv("TMDB_API_KEY")
    if not api_key:
        raise RuntimeError(
            "TMDB_API_KEY ausente. Copie .env.example para .env e preencha a chave."
        )
    return api_key


def _get_com_retry(url: str, params: dict, tentativas: int = 4) -> dict | None:
    """GET com retry/backoff. Trata 401/429 (rate limit transitorio do TMDB)."""
    for tentativa in range(1, tentativas + 1):
        try:
            resp = requests.get(url, params=params, timeout=30)
        except requests.RequestException as exc:
            logger.warning("Erro de rede (tentativa %s/%s): %s", tentativa, tentativas, exc)
            time.sleep(2 * tentativa)
            continue

        if resp.status_code == 200:
            return resp.json()

        # 401 em rajada ou 429 = rate limit -> esperar e tentar de novo
        if resp.status_code in (401, 429) and tentativa < tentativas:
            espera = 3 * tentativa
            logger.warning(
                "HTTP %s na pagina %s (provavel rate limit) - aguardando %ss...",
                resp.status_code, params.get("page"), espera,
            )
            time.sleep(espera)
            continue

        logger.error("HTTP %s: %s", resp.status_code, resp.text[:120])
        return None
    return None


def _descobrir_ids_ano(
    ano: int, vote_count_min: int, max_paginas: int, api_key: str
) -> list[int]:
    """Varre o /discover para um unico ano, paginando ate o limite real."""
    ids: list[int] = []
    params = {
        "api_key": api_key,
        "include_adult": "false",
        "include_video": "false",
        "language": "en-US",
        "primary_release_date.gte": f"{ano}-01-01",
        "primary_release_date.lte": f"{ano}-12-31",
        "sort_by": "popularity.desc",
    }
    if vote_count_min and vote_count_min > 0:
        params["vote_count.gte"] = vote_count_min

    pagina = 1
    total_pages = 1
    limite = max_paginas
    while pagina <= limite:
        params["page"] = pagina
        data = _get_com_retry(URL_DISCOVER, params)
        if data is None:
            break

        # Na primeira pagina, descobre quantas paginas existem de fato
        if pagina == 1:
            total_pages = data.get("total_pages", 1) or 1
            limite = min(max_paginas, total_pages, TMDB_MAX_PAGINAS)

        resultados = data.get("results", [])
        if not resultados:
            break
        ids.extend(f.get("id") for f in resultados)

        if pagina % 10 == 0:
            logger.info("  Ano %s: %s/%s paginas varridas", ano, pagina, limite)
        pagina += 1
        time.sleep(DELAY_DISCOVER)

    return ids


def extrair_lista_ids(
    ano_inicio: int = 2006,
    ano_fim: int = 2026,
    vote_count_min: int = 1000,
    max_paginas_por_ano: int = TMDB_MAX_PAGINAS,
    api_key: str | None = None,
) -> list[int]:
    """Coleta IDs via /discover fatiando POR ANO.

    Fatiar por ano burla o teto de 10.000 resultados por consulta do TMDB,
    permitindo coletar praticamente todos os filmes do intervalo. A
    paginacao e dinamica (le o total_pages real de cada ano).
    """
    api_key = api_key or _obter_api_key()
    logger.info(
        "Coletando IDs por ano (%s-%s) | vote_count>=%s | max %s pag/ano...",
        ano_inicio, ano_fim, vote_count_min, max_paginas_por_ano,
    )

    todos_ids: list[int] = []
    for ano in range(ano_inicio, ano_fim + 1):
        ids_ano = _descobrir_ids_ano(ano, vote_count_min, max_paginas_por_ano, api_key)
        logger.info("Ano %s: %s filmes encontrados.", ano, len(ids_ano))
        todos_ids.extend(ids_ano)

    # Dedup de seguranca (preserva ordem)
    todos_ids = list(dict.fromkeys(todos_ids))
    logger.info("Total de %s filmes mapeados para enriquecimento.", len(todos_ids))
    return todos_ids


def enriquecer_dados_financeiros(
    lista_ids: list[int],
    api_key: str | None = None,
    exigir_financeiros: bool = True,
) -> pd.DataFrame:
    """Passo 2: Busca orcamento, receita e dados tecnicos detalhados de cada ID."""
    api_key = api_key or _obter_api_key()
    total = len(lista_ids)

    if total == 0:
        logger.warning("Nenhum ID foi encontrado para enriquecer. Verifique sua API Key.")
        return pd.DataFrame()

    filmes_enriquecidos: list[dict] = []
    logger.info("Passo 1.1B: Buscando detalhes financeiros (Budget e Revenue) por filme...")

    for idx, movie_id in enumerate(lista_ids, start=1):
        url = f"{URL_DETAILS}{movie_id}"
        detalhes = _get_com_retry(url, {"api_key": api_key})

        if detalhes is not None:
            budget = detalhes.get("budget", 0)
            revenue = detalhes.get("revenue", 0)

            # Filtro de Qualidade de Dados: descarta linhas sem dados financeiros
            # (necessario para calcular ROI/Lucro). Desativavel via parametro.
            if (not exigir_financeiros) or (budget > 0 and revenue > 0):
                generos = [g.get("name") for g in detalhes.get("genres", [])]
                genero_principal = generos[0] if len(generos) > 0 else "N/A"
                genero_secundario = generos[1] if len(generos) > 1 else "N/A"

                filmes_enriquecidos.append(
                    {
                        "tmdb_id": detalhes.get("id"),
                        "imdb_id": detalhes.get("imdb_id"),
                        "title": detalhes.get("title"),
                        "release_date": detalhes.get("release_date"),
                        "runtime": detalhes.get("runtime"),
                        "budget_nominal": budget,
                        "revenue_nominal": revenue,
                        "genre_primary": genero_principal,
                        "genre_secondary": genero_secundario,
                        "vote_average": detalhes.get("vote_average"),
                        "vote_count": detalhes.get("vote_count"),
                    }
                )

        if idx % 50 == 0 or idx == total:
            logger.info("Progresso: %s/%s filmes analisados.", idx, total)

        time.sleep(DELAY_DETAILS)

    df = pd.DataFrame(filmes_enriquecidos)

    # DEDUPLICACAO: garante unicidade por tmdb_id (seguranca contra repeticoes)
    if not df.empty:
        antes = len(df)
        df = df.drop_duplicates(subset=["tmdb_id"], keep="first").reset_index(drop=True)
        removidos = antes - len(df)
        if removidos:
            logger.info("Deduplicacao: %s registro(s) removido(s).", removidos)

    return df


def executar_raspagem(
    ano_inicio: int = 2006,
    ano_fim: int = 2026,
    vote_count_min: int = 1000,
    max_paginas_por_ano: int = TMDB_MAX_PAGINAS,
    exigir_financeiros: bool = True,
    caminho_saida: str | None = None,
) -> str | None:
    """Ponto de entrada da camada Bronze: raspa, deduplica e salva CSV."""
    if caminho_saida is None:
        caminho_saida = str(BRUTOS_DIR / "tmdb_filmes_financeiro.csv")

    ids_filmes = extrair_lista_ids(
        ano_inicio=ano_inicio,
        ano_fim=ano_fim,
        vote_count_min=vote_count_min,
        max_paginas_por_ano=max_paginas_por_ano,
    )
    df_cinema = enriquecer_dados_financeiros(
        ids_filmes, exigir_financeiros=exigir_financeiros
    )

    if df_cinema.empty:
        logger.error("Falha no pipeline: o DataFrame final esta vazio.")
        return None

    os.makedirs(os.path.dirname(caminho_saida), exist_ok=True)
    df_cinema.to_csv(caminho_saida, index=False)
    logger.info(
        "Passo 1.1 concluido! %s filmes validos salvos em: %s", len(df_cinema), caminho_saida
    )
    return caminho_saida


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )
    executar_raspagem()
