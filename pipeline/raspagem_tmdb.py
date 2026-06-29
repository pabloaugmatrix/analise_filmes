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

# Filtros padrao do escopo do projeto (ultimos 20 anos e minimo de votos)
PARAMS_PADRAO = {
    "include_adult": "false",
    "include_video": "false",
    "language": "en-US",
    "primary_release_date.gte": "2006-01-01",
    "primary_release_date.lte": "2026-12-31",
    "sort_by": "popularity.desc",
    "vote_count.gte": 1000,
}


def _obter_api_key() -> str:
    """Le a TMDB_API_KEY do ambiente e aborta de forma clara se faltar."""
    api_key = os.getenv("TMDB_API_KEY")
    if not api_key:
        raise RuntimeError(
            "TMDB_API_KEY ausente. Copie .env.example para .env e preencha a chave."
        )
    return api_key


def extrair_lista_ids(total_paginas=40, api_key: str | None = None) -> list[int]:
    """Passo 1: Coleta os IDs dos filmes mais populares do periodo filtrado."""
    api_key = api_key or _obter_api_key()
    lista_ids: list[int] = []
    parametros = {**PARAMS_PADRAO, "api_key": api_key}

    logger.info("Passo 1.1A: Coletando IDs dos filmes mais populares no TMDB...")

    for pagina in range(1, total_paginas + 1):
        parametros["page"] = pagina
        try:
            response = requests.get(URL_DISCOVER, params=parametros, timeout=30)
        except requests.RequestException as exc:
            logger.error("Erro de rede na pagina %s: %s", pagina, exc)
            break

        if response.status_code == 200:
            resultados = response.json().get("results", [])
            if not resultados:
                logger.info("Pagina %s sem resultados - encerrando varredura.", pagina)
                break
            for filme in resultados:
                lista_ids.append(filme.get("id"))

            if pagina % 10 == 0:
                logger.info("Paginas varridas: %s/%s", pagina, total_paginas)
        else:
            logger.error(
                "Erro ao acessar pagina %s: HTTP %s", pagina, response.status_code
            )
            break

    logger.info("Total de %s filmes mapeados para enriquecimento.", len(lista_ids))
    return lista_ids


def enriquecer_dados_financeiros(
    lista_ids: list[int], api_key: str | None = None
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
        try:
            response = requests.get(url, params={"api_key": api_key}, timeout=30)
        except requests.RequestException as exc:
            logger.warning("Falha de rede ao buscar movie_id=%s: %s", movie_id, exc)
            continue

        if response.status_code == 200:
            detalhes = response.json()

            budget = detalhes.get("budget", 0)
            revenue = detalhes.get("revenue", 0)

            # Filtro de Qualidade de Dados: descarta linhas sem dados financeiros reais
            if budget > 0 and revenue > 0:
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
        else:
            logger.warning(
                "movie_id=%s retornou HTTP %s - ignorado.", movie_id, response.status_code
            )

        if idx % 50 == 0 or idx == total:
            logger.info("Progresso: %s/%s filmes analisados.", idx, total)

        # Delay de seguranca para evitar bloqueio de requisicoes por IP
        time.sleep(0.05)

    df = pd.DataFrame(filmes_enriquecidos)

    # DEDUPLICACAO: garante unicidade por tmdb_id (seguranca contra repeticoes)
    if not df.empty:
        antes = len(df)
        df = df.drop_duplicates(subset=["tmdb_id"], keep="first").reset_index(drop=True)
        removidos = antes - len(df)
        if removidos:
            logger.info("Deduplicacao: %s registro(s) removido(s).", removidos)

    return df


def executar_raspagem(total_paginas: int = 40, caminho_saida: str | None = None) -> str | None:
    """Ponto de entrada da camada Bronze: raspa, deduplica e salva CSV."""
    if caminho_saida is None:
        caminho_saida = str(BRUTOS_DIR / "tmdb_filmes_financeiro.csv")
    ids_filmes = extrair_lista_ids(total_paginas=total_paginas)
    df_cinema = enriquecer_dados_financeiros(ids_filmes)

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
