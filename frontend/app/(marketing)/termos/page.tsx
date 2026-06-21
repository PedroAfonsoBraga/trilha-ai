export default function TermosPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-16 md:pt-36">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          Termos de Uso
        </h1>
        <p className="mt-4 text-muted-foreground">
          Última atualizacao: Junho de 2025
        </p>

        <div className="mt-12 space-y-10 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">1. Aceitacao dos Termos</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Ao acessar e usar a Trilha, voce concorda com estes Termos de Uso.
              Se voce nao concordar com qualquer parte destes termos, nao utilize
              nossos servicos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Descricao do Servico</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              A Trilha e uma plataforma SaaS educacional que utiliza inteligencia
              artificial para processar editais de concursos publicos, gerar
              cronogramas de estudo, fichamentos academicos e flashcards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Planos e Cobranca</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Oferecemos planos gratuitos e pagos. Os valores sao exibidos
              claramente na pagina de precos. A cobranca dos planos pagos e
              recorrente e processada pelo Stripe. Voce pode cancelar a qualquer
              momento atraves do portal do cliente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Uso Aceitavel</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Voce concorda em nao utilizar a plataforma para fins ilegais, para
              violar direitos de terceiros, ou para distribuir conteudo malicioso.
              Reservamo-nos o direito de suspender contas que violarem estes
              termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              5. Propriedade Intelectual
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              A plataforma Trilha, seu codigo-fonte, design e marca sao de nossa
              propriedade. O conteudo gerado pela IA a partir dos seus editais
              pertence a voce.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              6. Limitacao de Responsabilidade
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              A Trilha e fornecida &quot;como esta&quot;. Nao garantimos que o
              servico sera ininterrupto ou livre de erros. Nao nos
              responsabilizamos por decisoes tomadas com base no conteudo gerado
              pela plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Modificacoes</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Podemos atualizar estes termos periodicamente. Alteracoes
              significativas serao comunicadas por email com no minimo 7 dias de
              antecedencia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Contato</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Duvidas sobre estes termos? Entre em contato pelo email{" "}
              <a
                href="mailto:contato@trilha.ai"
                className="text-primary hover:underline"
              >
                contato@trilha.ai
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
