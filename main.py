"""Entry point do projeto na raiz. So delega para o orquestrador do pipeline.

Uso:
    python main.py                 # pipeline completo
    python main.py --skip-raspagem  # so ETL
    python main.py --paginas 20 -v  # raspagem menor + verbose
"""
import sys

from pipeline.orchestrator import main

if __name__ == "__main__":
    sys.exit(main())
