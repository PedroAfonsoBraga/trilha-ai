🗺️ Visão Geral da Arquitetura de Layout (Wireframe)

O layout é dividido em três grandes blocos principais utilizando uma estrutura de Grelha/Flexbox Responsiva:

    Barra Lateral de Navegação (Sidebar): Fixa à esquerda, controle de histórico e menu global.

    Área de Conteúdo Central (Main Chat Area): Centralizada, com largura máxima delimitada (max-width) para garantir legibilidade de textos longos.

    Barra de Entrada de Texto (Input Container): Fixada no rodapé da área de conteúdo central, flutuando ou acompanhando o fluxo da página.

🛠️ Detalhamento dos Componentes (Markdown para Especificação)
1. Barra Lateral (Sidebar)

    Largura: Entre 240px e 280px.

    Alinhamento: Fixa à esquerda (position: fixed ou height: 100vh).

    Fundo: Cor sólida neutra muito clara (ex: #F9F9F9 ou #FAFAFA) ou cinza sutilmente texturado, com uma borda fina à direita de 1px (#E5E5E5).

    Elementos Internos (De cima para baixo):

        Header da Sidebar: Logo da aplicação alinhado à esquerda e um botão de ação com ícone para "Colapsar/Esconder Barra" + botão de "Novo Chat/Nova Conversa".

        Botão Novo Chat: Elemento de destaque. No ChatGPT/DeepSeek, possui formato oval ou retangular com bordas arredondadas (border-radius: 8px ou 20px), ícone de + e texto "Novo chat / Nova conversa".

        Lista de Histórico (Scroll de Navegação): * Agrupamento cronológico ("Hoje", "7 dias", "30 dias").

            Os itens de chat são links textuais com truncamento de texto (text-overflow: ellipsis) para não quebrar a linha.

            Efeito de Hover: O background do item muda ligeiramente para um cinza mais escuro/marcado quando o mouse passa por cima, revelando um botão de "três pontos" (menu de contexto) à direita.

        Footer da Sidebar: Perfil do usuário (Avatar redondo + Nome) e status do plano (ex: "Plano Gratuito / Fazer Upgrade").

2. Área de Conteúdo (Main Workspace)

    Comportamento: Flexível (flex-grow: 1). Se a barra lateral estiver aberta, ela ocupa o espaço restante da tela.

    Alinhamento do Texto: O texto não se estende por toda a largura da tela. Ele fica centralizado dentro de um container com largura máxima (max-width: 768px a 800px) para evitar fadiga visual na leitura.

    Tipografia e Hierarquia:

        Fontes: Serifada para blocos densos ou Sans-serif moderna (ex: Inter, Segoe UI, system-ui) com ótimo espaçamento entre linhas (line-height: 1.6).

        Títulos (H1, H2, H3): Em negrito, cor escura sólida (quase preta, #111111), com margem generosa antes de começar o parágrafo.

        Tabelas: Linhas horizontais muito finas e discretas para separar os dados. Cabeçalho em negrito. Sem bordas verticais (estilo minimalista).

        Componentes Inline de Código/Tags: Elementos como F2, voltage, Rout = 13Ω usam fonte monoespaçada com um fundo cinza claro (#F0F0F0) e bordas levemente arredondadas.

3. Caixa de Entrada/Prompt (Input Field)

    Posicionamento: Fixada na parte inferior da Área de Conteúdo. No Claude e DeepSeek, ela assume o comportamento de um "card flutuante" com sombra leve, enquanto no ChatGPT ela é integrada ao fluxo final com uma margem inferior.

    Largura: Acompanha a largura do container de texto (max-width: 768px).

    Estilização do Input:

        Fundo: Branco ou cinza extremamente claro.

        Borda: Arredondada (border-radius: 24px a 28px) com contorno suave (#E5E5E5).

        Comportamento do Campo: É uma textarea expansível (suporta múltiplas linhas sem quebrar o layout).

    Elementos Internos da Caixa:

        Placeholder: Texto discreto como "Escreva uma mensagem..." ou "Mensagem para [Nome do App]".

        Canto Inferior/Esquerdo: Ícones para anexar arquivos (ícone de clipe de papel) e ativação de modos especiais (ex: botão "Pensamento Profundo").

        Canto Inferior/Direito: Botão de envio (ícone de seta para cima ↑) dentro de um círculo. O botão fica colorido/ativo apenas quando há texto digitado.

🎨 Paleta de Cores Dominante
Elemento	Amostra/Código Sugerido	Estilo Visual
Fundo Principal (Canvas)	#FFFFFF (Branco Puro)	Limpo e focado no texto
Fundo da Sidebar	#F9F9F9 / #FAFAFA	Separação sutil da área de trabalho
Texto Primário	#1A1A1A / #0D0D0D	Alto contraste para leitura
Texto Secundário / Muted	#666666 / #737373	Usado em datas, placeholders e legendas
Bordas e Divisores	#E5E5E5 / #E0E0E0	Linhas finas de 1px
🕹️ Estados de Interação (Microinterações)

    Responsividade Lateral: Se a largura da tela diminuir além de um limite (geralmente 768px), a barra lateral se esconde automaticamente e um botão "hambúrguer" aparece no topo superior esquerdo para invocá-la como um menu sobreposto (drawer).

    Scroll: O scroll da página principal afeta apenas o texto. A barra de prompt inferior permanece fixa ou possui uma máscara de gradiente transparente para que o texto antigo suma elegantemente por trás dela ao rolar para baixo.