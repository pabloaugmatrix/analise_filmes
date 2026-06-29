"""Orquestrador unico do pipeline Cinema Analytics.

Executa, em ordem, as fases de extracao e transformacao:
    1) raspagem_tmdb.executar_raspagem()      -> camada Bronze (dados brutos)
    2) etl_consolidacao.executar_pipeline_etl() -> camada Trusted (dados tratados)

A visualizacao fica no frontend Next.js (pasta `frontend/`), separada deste pacote.

Uso (a partir da raiz do projeto):
    python main.py                  # roda raspagem + ETL
    python main.py --skip-raspagem  # pula a raspagem (usa Bronze existente)
    python main.py --paginas 20 -v  # raspagem menor + verbose
"""
from __future__ import annotations

import argparse
import logging
import sys

from dotenv import load_dotenv

from pipeline import LOG_DIR, PROJECT_ROOT, BRUTOS_DIR

load_dotenv(PROJECT_ROOT / ".env")

LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "pipeline.log"

logger = logging.getLogger("orchestrator")


def configurar_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(LOG_FILE, encoding="utf-8"),
        ],
    )


def orquestrar(skip_raspagem: bool = False, total_paginas: int = 40) -> int:
    """Executa o pipeline completo. Retorna exit code (0 = sucesso)."""
    logger.info("=" * 60)
    logger.info("INICIANDO PIPELINE CINEMA ANALYTICS")
    logger.info("=" * 60)

    # ----- Fase 1: Extracao (Bronze) -----
    if skip_raspagem:
        bronze_path = BRUTOS_DIR / "tmdb_filmes_financeiro.csv"
        if not bronze_path.exists():
            logger.error("--skip-raspagem informado, mas %s nao existe. Abortando.", bronze_path)
            return 1
        logger.info("Pulando raspagem (usando Bronze existente em %s).", bronze_path)
    else:
        from pipeline.raspagem_tmdb import executar_raspagem

        resultado = executar_raspagem(total_paginas=total_paginas)
        if resultado is None:
            logger.error("Fase 1 (raspagem) falhou - abortando pipeline.")
            return 1

    # ----- Fase 2: Transformacao (Trusted) -----
    from pipeline.etl_consolidacao import executar_pipeline_etl

    resultado = executar_pipeline_etl()
    if resultado is None:
        logger.error("Fase 2 (ETL) falhou - abortando pipeline.")
        return 1

    # ----- Fase 3: Visualizacao (frontend Next.js, separado) -----
    logger.info("=" * 60)
    logger.info("PIPELINE CONCLUIDO COM SUCESSO!")
    logger.info("Base Trusted disponivel para o frontend em: dados/processados/")
    logger.info("Log completo salvo em: %s", LOG_FILE)
    logger.info("=" * 60)
    return 0


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Orquestrador do pipeline Cinema Analytics")
    parser.add_argument(
        "--skip-raspagem",
        action="store_true",
        help="Pula a fase de raspagem e usa o CSV Bronze existente.",
    )
    parser.add_argument(
        "--paginas",
        type=int,
        default=40,
        help="Numero de paginas do TMDB a varrer (default: 40).",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Habilita logs de debug.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Ponto de entrada reusavel (chamado pelo main.py da raiz)."""
    args = _parse_args(argv)
    configurar_logging(verbose=args.verbose)
    return orquestrar(skip_raspagem=args.skip_raspagem, total_paginas=args.paginas)


if __name__ == "__main__":
    sys.exit(main())
