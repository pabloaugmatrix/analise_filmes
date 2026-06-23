import streamlit as st
import pandas as pd
import plotly.express as px

# 1. Configuração da Página e Estilo (Design Focado em Tomada de Decisão)
st.set_page_config(page_title="Cinema Analytics Dashboard", layout="wide", initial_sidebar_state="expanded")

st.title("🎬 Cinema Analytics Dashboard")
st.markdown("### Suporte à Decisão Estratégica e Análise Financeira (Últimos 20 Anos)")
st.markdown("---")


# 2. Carga dos Dados Processados (Base Trusted)
@st.cache_data
def carregar_dados_analiticos():
    df = pd.read_csv("dados/processados/cinematografia_analytics_trusted.csv")
    return df


try:
    df_clean = carregar_dados_analiticos()
except FileNotFoundError:
    st.error("❌ Arquivo de dados consolidados não encontrado! Por favor, execute o script 'etl_consolidacao.py' antes.")
    st.stop()

# 3. Painel Lateral - Filtros Dinâmicos (Interação e Validação)
st.sidebar.header("🔍 Filtros de Mercado")

# Filtro por Gênero Principal
todos_generos = sorted(df_clean['genre_primary'].dropna().unique())
generos_selecionados = st.sidebar.multiselect("Gênero Principal", todos_generos, default=todos_generos)

# Filtro por Ano de Lançamento
ano_min, ano_max = int(df_clean['ano_lancamento'].min()), int(df_clean['ano_lancamento'].max())
periodo_anos = st.sidebar.slider("Período de Lançamento", ano_min, ano_max, (ano_min, ano_max))

# Aplicação dos filtros reativos no DataFrame
df_filtrado = df_clean[
    (df_clean['genre_primary'].isin(generos_selecionados)) &
    (df_clean['ano_lancamento'].between(periodo_anos[0], periodo_anos[1]))
    ]

# 4. Seção Superior: Indicadores-Chave e KPIs Estratégicos
st.markdown("#### 📊 Indicadores-Chave de Desempenho (KPIs)")
kpi_col1, kpi_col2, kpi_col3 = st.columns(3)

with kpi_col1:
    roi_medio = df_filtrado['roi_real'].mean() * 100
    st.metric(label="📈 ROI Real Médio (Meta: >20%)", value=f"{roi_medio:.2f}%",
              delta=f"{roi_medio - 20:.2f}% de Margem")

with kpi_col2:
    taxa_assertividade = df_filtrado['superou_orcamento'].mean() * 100
    st.metric(label="🎯 Taxa de Assertividade (Meta: >60%)", value=f"{taxa_assertividade:.2f}%",
              delta=f"{taxa_assertividade - 60:.2f}% da Meta")

with kpi_col3:
    receita_media = df_filtrado['revenue_real'].mean() / 1e6
    st.metric(label="💰 Receita Real Média por Filme", value=f"${receita_media:.1f}M",
              delta=f"${receita_media - 50:.1f}M vs Meta ($50M)")

st.markdown("---")

# 5. Organização das Abas por Personas (Visão de Negócio)
aba_investidor, aba_analista = st.tabs(["💰 Visão: Investidores & Produtores", "📈 Visão: Analistas de Mercado"])

# ------------------------------------------------------------------------------
# ABA 1: INVESTIDORES & PRODUTORES (Mitigação de Riscos e ROI por Gênero)
# ------------------------------------------------------------------------------
with aba_investidor:
    st.subheader("Análise de Risco, Alocação de Orçamento e Retorno")

    col_inv1, col_inv2 = st.columns(2)

    with col_inv1:
        st.markdown("**Como o orçamento influencia a bilheteria e o lucro proporcional (Perguntas 1 e 2)?**")

        # CORREÇÃO AQUI: Criamos uma coluna de tamanho garantida >= 0 (mínimo de 1 para não sumir do gráfico)
        # Usamos o lucro_real absoluto, mas você também pode mudar para 'budget_real' ou 'revenue_real' se preferir evitar distorção de tamanho em prejuízos.
        df_scatter1_data = df_filtrado.copy()
        df_scatter1_data['tamanho_marcador'] = df_scatter1_data['lucro_real'].apply(lambda x: max(x, 1))

        fig_scatter1 = px.scatter(
            df_scatter1_data,
            x="budget_real",
            y="revenue_real",
            color="genre_primary",
            size="tamanho_marcador",  # <-- Usa a coluna corrigida para o tamanho geométrico
            hover_name="title",
            hover_data={"lucro_real": ":$,.2f", "budget_real": ":$,.2f", "revenue_real": ":$,.2f",
                        "tamanho_marcador": False},  # Mostra o lucro real (mesmo negativo) no hover
            trendline="ols",
            labels={"budget_real": "Orçamento Real ($)", "revenue_real": "Receita Real ($)",
                    "lucro_real": "Lucro Real ($)"},
            template="plotly_white"
        )
        st.plotly_chart(fig_scatter1, use_container_width=True)

    with col_inv2:
        st.markdown("**Qual a relação entre Gênero e Retorno Financeiro Médio (Perguntas 3 e 4)?**")
        df_genero_financeiro = df_filtrado.groupby('genre_primary').agg(
            roi_medio=('roi_real', 'mean'),
            lucro_medio=('lucro_real', 'mean')
        ).reset_index()

        df_genero_financeiro['roi_medio'] *= 100

        fig_bar1 = px.bar(
            df_genero_financeiro,
            x="genre_primary",
            y="roi_medio",
            labels={"genre_primary": "Gênero", "roi_medio": "ROI Real Médio (%)"},
            template="plotly_white"
        )

        # CORREÇÃO AQUI: Rótulos de texto compatíveis com versões antigas do Plotly
        fig_bar1.update_traces(
            marker_color='#636EFA',
            texttemplate='%{y:.1f}%',  # Mostra o valor do eixo Y com uma casa decimal e o símbolo %
            textposition='outside'  # Força o texto a ficar por fora da barra
        )

        st.plotly_chart(fig_bar1, use_container_width=True)

# ------------------------------------------------------------------------------
# ABA 2: ANALISTAS DE MERCADO (Duração, Avaliação e Recepção do Público)
# ------------------------------------------------------------------------------
with aba_analista:
    st.subheader("Otimização de Produto: Duração, Avaliação Crítica e Bilheteria")

    col_ana1, col_ana2 = st.columns(2)

    with col_ana1:
        st.markdown("**A nota média do público (IMDb) influencia a receita/lucro do filme (Perguntas 5 e 6)?**")
        fig_scatter2 = px.scatter(
            df_filtrado, x="vote_average", y="revenue_real", color="genre_primary",
            hover_name="title", labels={"vote_average": "Nota Média (IMDb)", "revenue_real": "Receita Real ($)"},
            template="plotly_white"
        )
        st.plotly_chart(fig_scatter2, use_container_width=True)

    with col_ana2:
        st.markdown(
            "**Qual o impacto da duração (runtime) no sucesso financeiro e nas avaliações (Perguntas 7, 8 e 9)?**")
        fig_scatter3 = px.scatter(
            df_filtrado, x="runtime", y="roi_real", color="vote_average",
            hover_name="title", labels={"runtime": "Duração (Minutos)", "roi_real": "ROI Real"},
            color_continuous_scale=px.colors.sequential.Viridis, template="plotly_white"
        )
        st.plotly_chart(fig_scatter3, use_container_width=True)

    # Matriz/Tabela de Consulta para responder à Pergunta 10 (Melhores Combinações)
    st.markdown("#### 🎯 Cruzamento Geral: Melhores Combinações de Desempenho (Pergunta 10)")
    st.dataframe(
        df_filtrado[['title', 'genre_primary', 'budget_real', 'runtime', 'vote_average', 'roi_real', 'lucro_real']]
        .sort_values(by='lucro_real', ascending=False)
        .head(20),
        use_container_width=True
    )