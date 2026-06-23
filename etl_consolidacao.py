import os
import pandas as pd


def carregar_tabela_cpi():
    """Retorna o mapeamento do CPI baseado nos dados oficiais do BLS."""
    # Índices históricos médios do BLS de 2006 a 2026
    # O fator multiplicador traz o valor nominal da época para o poder de compra atual (2026)
    dados_cpi = {
        'ano_lancamento': [2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
                           2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        'cpi_medio': [201.6, 207.3, 215.3, 214.5, 218.1, 224.9, 229.6, 233.0, 236.7, 237.0,
                      240.0, 245.1, 251.1, 255.7, 258.8, 271.0, 292.7, 304.7, 314.1, 324.5, 334.2]
    }
    df = pd.DataFrame(dados_cpi)

    # Base de referência atual: 2026
    cpi_2026 = df[df['ano_lancamento'] == 2026]['cpi_medio'].values[0]
    df['fator_deflator'] = cpi_2026 / df['cpi_medio']
    return df


def executar_pipeline_etl():
    print("🔄 Iniciando a Sprint 2: Transformação e Consolidação (ETL)...")

    caminho_filmes = "dados/brutos/tmdb_filmes_financeiro.csv"
    if not os.path.exists(caminho_filmes):
        print(f"❌ Erro: Arquivo {caminho_filmes} não encontrado. Rode o script de raspagem primeiro.")
        return

    # 1. Carrega os dados brutos obtidos no passo anterior
    df_filmes = pd.read_csv(caminho_filmes)

    # Extrai o ano de lançamento a partir da string de data (YYYY-MM-DD)
    df_filmes['release_date'] = pd.to_datetime(df_filmes['release_date'], errors='coerce')
    df_filmes['ano_lancamento'] = df_filmes['release_date'].dt.year

    # Filtro de segurança: remove registros que falharam na conversão de data ou fora do escopo
    df_filmes = df_filmes.dropna(subset=['ano_lancamento'])
    df_filmes['ano_lancamento'] = df_filmes['ano_lancamento'].astype(int)

    # 2. Carrega a tabela de referência de inflação (BLS)
    df_cpi = carregar_tabela_cpi()

    # 3. Integração via Left Join utilizando o Ano de Lançamento como chave
    df_consolidado = pd.merge(df_filmes, df_cpi, on='ano_lancamento', how='left')

    # Preenche possíveis anos sem fator (ex: 2026 que use o fator 1.0) com tratamento default
    df_consolidado['fator_deflator'] = df_consolidado['fator_deflator'].fillna(1.0)

    print("📐 Calculando indicadores reais e normalizados...")

    # 4. Regras de Negócio & Métricas Relativizadas (Indicadores)
    df_consolidado['budget_real'] = df_consolidado['budget_nominal'] * df_consolidado['fator_deflator']
    df_consolidado['revenue_real'] = df_consolidado['revenue_nominal'] * df_consolidado['fator_deflator']

    # Lucro Real = Receita Real - Orçamento Real
    df_consolidado['lucro_real'] = df_consolidado['revenue_real'] - df_consolidado['budget_real']

    # ROI Real = Lucro Real / Orçamento Real
    df_consolidado['roi_real'] = df_consolidado['lucro_real'] / df_consolidado['budget_real']

    # Validação de assertividade comercial individual (Receita > Orçamento)
    df_consolidado['superou_orcamento'] = df_consolidado['revenue_real'] > df_consolidado['budget_real']

    # 5. Exportação da base Trusted (Pronta para a visualização analítica)
    os.makedirs("dados/processados", exist_ok=True)
    caminho_trusted = "dados/processados/cinematografia_analytics_trusted.csv"
    df_consolidado.to_csv(caminho_trusted, index=False)

    print(f"✅ Pipeline ETL concluído com sucesso!")
    print(f"📦 Base analítica consolidada salva em: '{caminho_trusted}'")

    # --- Exibição de Resumo de Saúde dos KPIs Estratégicos no Terminal ---
    print("\n==================================================")
    print("📊 CHECKPOINT DE SAÚDE DOS KPIs (MÉTRICAS DO DATASET)")
    print("==================================================")
    roi_medio = df_consolidado['roi_real'].mean() * 100
    taxa_assertividade = df_consolidado['superou_orcamento'].mean() * 100
    receita_media = df_consolidado['revenue_real'].mean() / 1e6

    print(f"🎯 ROI Real Médio: {roi_medio:.2f}% | Meta: > 20%")
    print(f"🎯 Taxa de Assertividade: {taxa_assertividade:.2f}% | Meta: > 60%")
    print(f"🎯 Receita Real Média por Filme: ${receita_media:.2f}M | Meta: > $50M")
    print("==================================================")


if __name__ == "__main__":
    executar_pipeline_etl()