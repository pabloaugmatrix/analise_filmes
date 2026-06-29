"""Pacote do pipeline Cinema Analytics (extracao + ETL).

Centraliza constantes de caminho relativas a raiz do projeto,
para que os modulos funcionem independente do diretorio de invocacao.
"""
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DADOS_DIR = PROJECT_ROOT / "dados"
BRUTOS_DIR = DADOS_DIR / "brutos"
PROCESSADOS_DIR = DADOS_DIR / "processados"
LOG_DIR = PROJECT_ROOT / "logs"

__all__ = ["PROJECT_ROOT", "DADOS_DIR", "BRUTOS_DIR", "PROCESSADOS_DIR", "LOG_DIR"]
