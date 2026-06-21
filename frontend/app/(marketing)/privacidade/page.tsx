export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-16 md:pt-36">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          Politica de Privacidade
        </h1>
        <p className="mt-4 text-muted-foreground">
          Ultima atualizacao: Junho de 2025
        </p>

        <div className="mt-12 space-y-10 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">
              1. Dados que Coletamos
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Coletamos apenas os dados necessarios para o funcionamento da
              plataforma: email, nome, e os PDFs de editais que voce envia.
              Nao vendemos seus dados para terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Como Usamos seus Dados</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Utilizamos seus dados exclusivamente para fornecer os servicos da
              Trilha: processamento de editais, geracao de cronogramas,
              fichamentos e flashcards. Seus PDFs sao processados pela IA e
              armazenados de forma segura no Supabase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Armazenamento</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Seus dados sao armazenados no Supabase, com criptografia em
              transito e em repouso. Utilizamos Row Level Security (RLS) para
              garantir que apenas voce acesse seus proprios dados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              4. IA e Processamento de Terceiros
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Utilizamos a API do DeepSeek para processamento de linguagem
              natural dos seus editais. Os dados enviados para a API sao apenas
              o texto extraido do PDF, sem informacoes pessoais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Seus Direitos (LGPD)</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              De acordo com a Lei Geral de Protecao de Dados, voce tem direito a
              acessar, corrigir e excluir seus dados. Para exercer esses
              direitos, entre em contato pelo email{" "}
              <a
                href="mailto:contato@trilha.ai"
                className="text-primary hover:underline"
              >
                contato@trilha.ai
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Cookies</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Utilizamos cookies essenciais para autenticacao via Supabase.
              Nao utilizamos cookies de rastreamento ou publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              7. Alteracoes nesta Politica
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Podemos atualizar esta politica periodicamente. Alteracoes
              significativas serao comunicadas por email.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
