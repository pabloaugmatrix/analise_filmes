import os
import requests
import pandas as pd
import time

# ==============================================================================
# CONFIGURAÇÃO: Insira sua API Key de 32 caracteres gerada no painel do TMDB aqui
# ==============================================================================
TMDB_API_KEY = "5d97a20a95d3cd4432c54eadeb333e7e"

URL_DISCOVER = "https://api.themoviedb.org/3/discover/movie"
URL_DETAILS = "https://api.themoviedb.org/3/movie/"


def extrair_lista_ids(total_paginas=40):
    """Passo 1: Coleta os IDs dos filmes mais populares do período filtrado."""
    lista_ids = []

    # Filtros baseados no escopo do projeto (últimos 20 anos e min de 1000 votos)
    parametros = {
        "api_key": TMDB_API_KEY,  # Autenticação via query string
        "include_adult": "false",
        "include_video": "false",
        "language": "en-US",
        "primary_release_date.gte": "2006-01-01",
        "primary_release_date.lte": "2026-12-31",
        "sort_by": "popularity.desc",
        "vote_count.gte": 1000
    }

    print("🚀 Passo 1.1A: Coletando IDs dos filmes mais populares no TMDB...")

    for pagina in range(1, total_paginas + 1):
        parametros["page"] = pagina
        response = requests.get(URL_DISCOVER, params=parametros)

        if response.status_code == 200:
            resultados = response.json().get("results", [])
            if not resultados:
                break
            for filme in resultados:
                lista_ids.append(filme.get("id"))

            if pagina % 10 == 0:
                print(f"📦 Páginas varridas: {pagina}/{total_paginas}")
        else:
            print(f"❌ Erro ao acessar página {pagina}: {response.status_code}")
            break

    print(f"🎯 Total de {len(lista_ids)} filmes mapeados para enriquecimento.")
    return lista_ids


def enriquecer_dados_financeiros(lista_ids):
    """Passo 2: Busca orçamento, receita e dados técnicos detalhados de cada ID."""
    filmes_enriquecidos = []
    total = len(lista_ids)

    if total == 0:
        print("⚠️ Nenhum ID foi encontrado para enriquecer. Verifique sua API Key.")
        return pd.DataFrame()

    print("\n🚀 Passo 1.1B: Buscando detalhes financeiros (Budget e Revenue) por filme...")

    for idx, movie_id in enumerate(lista_ids, start=1):
        url = f"{URL_DETAILS}{movie_id}"
        # Passa a chave de autenticação para a requisição de detalhes
        response = requests.get(url, params={"api_key": TMDB_API_KEY})

        if response.status_code == 200:
            detalhes = response.json()

            budget = detalhes.get("budget", 0)
            revenue = detalhes.get("revenue", 0)

            # Filtro de Qualidade de Dados: descarta linhas sem dados financeiros reais
            if budget > 0 and revenue > 0:
                # Mapeamento e separação dos gêneros
                generos = [g.get("name") for g in detalhes.get("genres", [])]
                genero_principal = generos[0] if len(generos) > 0 else "N/A"
                genero_secundario = generos[1] if len(generos) > 1 else "N/A"

                filmes_enriquecidos.append({
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
                    "vote_count": detalhes.get("vote_count")
                })

        # Monitoramento do progresso no terminal
        if idx % 50 == 0 or idx == total:
            print(f"🔄 Progresso: {idx}/{total} filmes analisados...")

        # Delay de segurança para evitar bloqueio de requisições por IP
        time.sleep(0.05)

    return pd.DataFrame(filmes_enriquecidos)


if __name__ == "__main__":
    # Inicia a execução do pipeline da Sprint 1
    ids_filmes = extrair_lista_ids(total_paginas=40)
    df_cinema = enriquecer_dados_financeiros(ids_filmes)

    # Valida se gerou dados antes de tentar salvar
    if not df_cinema.empty:
        # Cria a árvore de diretórios do projeto final
        os.makedirs("dados/brutos", exist_ok=True)

        caminho_saida = "dados/brutos/tmdb_filmes_financeiro.csv"
        df_cinema.to_csv(caminho_saida, index=False)
        print(f"\n✅ Passo 1.1 Concluído! {len(df_cinema)} filmes válidos filtrados e salvos em: '{caminho_saida}'")
    else:
        print("\n❌ Falha no pipeline: O DataFrame final está vazio.")