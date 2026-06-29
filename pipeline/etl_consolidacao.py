import os
import logging

import pandas as pd
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


def carregar_tabela_cpi() -> pd.DataFrame:
    """Retorna o mapeamento do CPI baseado nos dados oficiais do BLS."""
    dados_cpi = {
        'ano_lancamento': [2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
                           2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        'cpi_medio': [201.6, 207.3, 215.3, 214.5, 218.1, 224.9, 229.6, 233.0, 236.7, 237.0,
                      240.0, 245.1, 251.1, 255.7, 258.8, 271.0, 292.7, 304.7, 314.1, 324.5, 334.2]
    }
    df = pd.DataFrame(dados_cpi)
    cpi_2026 = df[df['ano_lancamento'] == 2026]['cpi_medio'].values[0]
    df['fator_deflator'] = cpi_2026 / df['cpi_medio']
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
