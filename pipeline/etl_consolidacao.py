import os
import time
import logging

import pandas as pd
import requests
import pandera as pa
from pandera import Column, Check, DataFrameSchema

from pipeline import BRUTOS_DIR, PROCESSADOS_DIR

logger = logging.getLogger(__name__)

# ==============================================================================
# SCHEMA DE VALIDACAO - CAMADA BRONZE (entrada do ETL)
# ==============================================================================
SCHEMA_BRONZE = DataFrameSchema(
    {
        "tmdb_id": Column(int, checks=Check.ge(1), nullable=False, unique=True),
        "imdb_id": Column(object, nullable=True),
        "title": Column(object, nullable=False),
        "release_date": Column(object, nullable=False),
        "runtime": Column(int, checks=Check.ge(0), nullable=True),
        "budget_nominal": Column(int, checks=Check.gt(0), nullable=False),
        "revenue_nominal": Column(int, checks=Check.gt(0), nullable=False),
        "genre_primary": Column(object, nullable=True),
        "genre_secondary": Column(object, nullable=True),
        "vote_average": Column(float, checks=Check.in_range(0, 10), nullable=True),
        "vote_count": Column(int, checks=Check.ge(0), nullable=True),
    },
    strict=False,
    coerce=True,
)

# ==============================================================================
# SCHEMA DE VALIDACAO - CAMADA TRUSTED (saida do ETL)
# ==============================================================================
SCHEMA_TRUSTED = DataFrameSchema(
    {
        "tmdb_id": Column(int, checks=Check.ge(1), nullable=False, unique=True),
        "title": Column(object, nullable=False),
        "ano_lancamento": Column(int, checks=Check.in_range(1900, 2100), nullable=False),
        "budget_nominal": Column(int, nullable=False),
        "revenue_nominal": Column(int, nullable=False),
        "budget_real": Column(float, nullable=False),
        "revenue_real": Column(float, nullable=False),
        "lucro_real": Column(float, nullable=False),
        "roi_real": Column(float, nullable=True),
        "superou_orcamento": Column(bool, nullable=False),
        "fator_deflator": Column(float, checks=Check.gt(0), nullable=False),
    },
    strict=False,
    coerce=True,
)


# ==============================================================================
# AJUSTE INFLACIONARIO - API PUBLICA DO BLS (Bureau of Labor Statistics)
# ==============================================================================
# Serie CPI-U (All Items, U.S. city average): indice oficial de inflacao ao
# consumidor. A API entrega valores mensais; a media anual e calculada a partir
# dos 12 meses de cada ano (metodo oficial do BLS).
BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"
BLS_SERIES_CPI_U = "CUUR0000SA0"

# Tabela estatica de fallback (medias anuais oficiais BLS). Usada quando a API
# esta indisponivel ou para anos ainda nao publicados (ex.: ano-base futuro).
_CPI_FALLBACK: dict[int, float] = {
    2006: 201.6, 2007: 207.3, 2008: 215.3, 2009: 214.5, 2010: 218.1,
    2011: 224.9, 2012: 229.6, 2013: 233.0, 2014: 236.7, 2015: 237.0,
    2016: 240.0, 2017: 245.1, 2018: 251.1, 2019: 255.7, 2020: 258.8,
    2021: 271.0, 2022: 292.7, 2023: 304.7, 2024: 314.1, 2025: 324.5,
    2026: 334.2,
}


def _buscar_cpi_bls(ano_inicio: int, ano_fim: int) -> dict[int, float] | None:
    """Consulta a API publica do BLS e retorna {ano: cpi_medio_anual}.

    A API gratuita limita a 10 anos por consulta, por isso fatiamos em janelas.
    Retorna None se a API falhar (caller usa o fallback estatico).
    """
    api_key = os.getenv("BLS_API_KEY")  # opcional; eleva limites diarios
    resultado: dict[int, float] = {}
    mensais: dict[int, list[float]] = {}
    janela = 10  # teto da API gratuita por consulta

    for ini in range(ano_inicio, ano_fim + 1, janela):
        fim = min(ini + janela - 1, ano_fim)
        body = {
            "seriesid": [BLS_SERIES_CPI_U],
            "startyear": str(ini),
            "endyear": str(fim),
        }
        if api_key:
            body["registrationkey"] = api_key

        try:
            resp = requests.post(BLS_API_URL, json=body, timeout=30)
            resp.raise_for_status()
            payload = resp.json()
        except (requests.RequestException, ValueError) as exc:
            logger.warning(
                "BLS API indisponivel para %s-%s (%s). Continuando com fallback.",
                ini, fim, exc,
            )
            return None

        if payload.get("status") != "REQUEST_SUCCEEDED":
            logger.warning(
                "BLS API retornou status '%s'. Continuando com fallback.",
                payload.get("status"),
            )
            return None

        series = payload.get("Results", {}).get("series", [])
        if not series:
            logger.warning("BLS: nenhuma serie no payload. Continuando com fallback.")
            return None

        for item in series[0].get("data", []):
            # A API entrega apenas valores mensais (M01-M12); a media anual
            # oficial do BLS e a media aritmetica dos 12 meses do ano.
            period = item.get("period", "")
            if not period.startswith("M") or period == "M13":
                continue
            try:
                mensais.setdefault(int(item["year"]), []).append(float(item["value"]))
            except (ValueError, KeyError, TypeError):
                continue

        time.sleep(1)  # cortesia para nao estourar o limite gratuito

    # So forma a media anual de anos COMPLETOS (12 meses publicados). Anos
    # parciais (ex.: ano em curso) ficam de fora e caem no fallback estatico.
    for ano, valores in mensais.items():
        if len(valores) == 12:
            resultado[ano] = round(sum(valores) / 12, 1)

    if not resultado:
        logger.warning("BLS: nenhum ano completo retornado. Continuando com fallback.")
        return None

    return resultado


def carregar_tabela_cpi(ano_inicio: int = 2006, ano_fim: int = 2026) -> pd.DataFrame:
    """Retorna o CPI anual (media) por ano de lancamento + fator deflator.

    Prioriza dados em tempo real da API publica do BLS (serie CPI-U). Anos nao
    cobertos pela API (ex.: ano-base futuro/projetado) sao preenchidos com a
    tabela estatica oficial de fallback. O fator deflator usa o ultimo ano do
    intervalo como base (poder de compra corrente).
    """
    anos = list(range(ano_inicio, ano_fim + 1))
    cpi_por_ano: dict[int, float] = {}

    api = _buscar_cpi_bls(ano_inicio, ano_fim)
    if api is not None:
        usados = 0
        for ano in anos:
            if ano in api:
                cpi_por_ano[ano] = api[ano]
                usados += 1
            elif ano in _CPI_FALLBACK:
                cpi_por_ano[ano] = _CPI_FALLBACK[ano]
        logger.info(
            "CPI: %s/%s anos obtidos via API BLS (restante do fallback estatico).",
            usados, len(anos),
        )
    else:
        cpi_por_ano = {a: _CPI_FALLBACK[a] for a in anos if a in _CPI_FALLBACK}
        logger.info("CPI: usando tabela estatica de fallback (API BLS indisponivel).")

    if not cpi_por_ano:
        raise RuntimeError("Sem valores de CPI para o intervalo solicitado.")

    df = pd.DataFrame(
        sorted(cpi_por_ano.items()), columns=["ano_lancamento", "cpi_medio"]
    )
    base = df["cpi_medio"].iloc[-1]  # base = ultimo ano do intervalo
    df["fator_deflator"] = base / df["cpi_medio"]
    return df


def _validar_e_deduplicar_bronze(df: pd.DataFrame) -> pd.DataFrame:
    """Aplica schema validation, deduplica por tmdb_id e remove datas invalidas."""
    antes = len(df)
    df = df.drop_duplicates(subset=["tmdb_id"], keep="first")
    removidos = antes - len(df)
    if removidos:
        logger.info("Bronze: %s duplicata(s) removida(s) por tmdb_id.", removidos)

    df = df.dropna(subset=["tmdb_id", "title", "release_date",
                           "budget_nominal", "revenue_nominal"]).reset_index(drop=True)

    try:
        df = SCHEMA_BRONZE.validate(df, lazy=True)
    except pa.errors.SchemaErrors as exc:
        logger.error("Schema validation falhou na camada Bronze:\n%s",
                     exc.failure_cases.head(20).to_string())
        raise

    logger.info("Bronze validada: %s registros aptos para transformacao.", len(df))
    return df


def executar_pipeline_etl(
    caminho_filmes: str | None = None,
    caminho_trusted: str | None = None,
) -> str | None:
    if caminho_filmes is None:
        caminho_filmes = str(BRUTOS_DIR / "tmdb_filmes_financeiro.csv")
    if caminho_trusted is None:
        caminho_trusted = str(PROCESSADOS_DIR / "cinematografia_analytics_trusted.csv")
    logger.info("Iniciando Sprint 2: Transformacao e Consolidacao (ETL)...")

    if not os.path.exists(caminho_filmes):
        logger.error("Arquivo %s nao encontrado. Rode a raspagem primeiro.", caminho_filmes)
        return None

    df_filmes = pd.read_csv(caminho_filmes)

    # Validacao + deduplicacao da entrada
    df_filmes = _validar_e_deduplicar_bronze(df_filmes)

    # Extrai ano a partir da data
    df_filmes['release_date'] = pd.to_datetime(df_filmes['release_date'], errors='coerce')
    df_filmes['ano_lancamento'] = df_filmes['release_date'].dt.year
    df_filmes = df_filmes.dropna(subset=['ano_lancamento'])
    df_filmes['ano_lancamento'] = df_filmes['ano_lancamento'].astype(int)

    # Join com CPI
    df_cpi = carregar_tabela_cpi()
    df_consolidado = pd.merge(df_filmes, df_cpi, on='ano_lancamento', how='left')
    df_consolidado['fator_deflator'] = df_consolidado['fator_deflator'].fillna(1.0)

    logger.info("Calculando indicadores reais e normalizados...")
    df_consolidado['budget_real'] = df_consolidado['budget_nominal'] * df_consolidado['fator_deflator']
    df_consolidado['revenue_real'] = df_consolidado['revenue_nominal'] * df_consolidado['fator_deflator']
    df_consolidado['lucro_real'] = df_consolidado['revenue_real'] - df_consolidado['budget_real']
    df_consolidado['roi_real'] = df_consolidado['lucro_real'] / df_consolidado['budget_real']
    df_consolidado['superou_orcamento'] = df_consolidado['revenue_real'] > df_consolidado['budget_real']

    # Validacao do schema de saida (Trusted)
    try:
        df_consolidado = SCHEMA_TRUSTED.validate(df_consolidado, lazy=True)
    except pa.errors.SchemaErrors as exc:
        logger.error("Schema validation falhou na camada Trusted:\n%s",
                     exc.failure_cases.head(20).to_string())
        raise

    os.makedirs(os.path.dirname(caminho_trusted), exist_ok=True)
    df_consolidado.to_csv(caminho_trusted, index=False)
    logger.info("Pipeline ETL concluido! Base consolidada salva em: %s", caminho_trusted)

    _logar_kpis(df_consolidado)
    return caminho_trusted


def _logar_kpis(df: pd.DataFrame) -> None:
    logger.info("=" * 50)
    logger.info("CHECKPOINT DE SAUDE DOS KPIs")
    logger.info("=" * 50)
    roi_medio = df['roi_real'].mean() * 100
    taxa_assertividade = df['superou_orcamento'].mean() * 100
    receita_media = df['revenue_real'].mean() / 1e6
    logger.info("ROI Real Medio: %.2f%% | Meta: > 20%%", roi_medio)
    logger.info("Taxa de Assertividade: %.2f%% | Meta: > 60%%", taxa_assertividade)
    logger.info("Receita Real Media por Filme: $%.2fM | Meta: > $50M", receita_media)
    logger.info("=" * 50)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )
    executar_pipeline_etl()
