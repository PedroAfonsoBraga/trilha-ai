export default function TermosPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-16 md:pt-36">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          Termos de Uso
        </h1>
        <p className="mt-4 text-muted-foreground">
          Última atualização: Junho de 2026
        </p>

        <div className="mt-12 space-y-10 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">1. Aceitação dos Termos</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Ao acessar e usar a Trilha, você concorda com estes Termos de Uso.
              Se você não concordar com qualquer parte destes termos, não utilize
              nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Descrição do Serviço</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              A Trilha é uma plataforma SaaS educacional que utiliza inteligência
              artificial (Google Gemini com modelo Gemma 4 26B via Generate Content API) para
              processar editais de concursos públicos, gerar cronogramas de estudo
              personalizados e flashcards inteligentes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Planos e Cobrança</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Oferecemos planos gratuitos e pagos. Os valores são exibidos
              claramente na página de preços. A cobrança dos planos pagos é
              recorrente e processada pelo Stripe. Você pode cancelar a qualquer
              momento através do portal do cliente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Uso Aceitável</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Você concorda em não utilizar a plataforma para fins ilegais, para
              violar direitos de terceiros, ou para distribuir conteúdo malicioso.
              Reservamo-nos o direito de suspender contas que violarem estes
              termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              5. Propriedade Intelectual
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              A plataforma Trilha, seu código-fonte, design e marca são de nossa
              propriedade. O conteúdo gerado pela IA a partir dos seus documentos
              pertence a você.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              6. Limitação de Responsabilidade
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              A Trilha é fornecida &quot;como está&quot;. Não garantimos que o
              serviço será ininterrupto ou livre de erros. Não nos
              responsabilizamos por decisões tomadas com base no conteúdo gerado
              pela plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              7. Inteligência Artificial e Cache
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Utilizamos IA generativa (Google Gemini com modelo Gemma 4 26B) para
              processar seus documentos. Para otimizar custos e performance,
              implementamos um sistema de cache que armazena temporariamente
              outputs de IA já processados (como análises de editais e
              flashcards). O cache expira automaticamente entre 1 hora e 7
              dias dependendo do tipo de conteúdo. Chat em tempo real não é
              armazenado em cache. O custo estimado de cada chamada de IA é
              rastreado e associado à sua conta para fins de monitoramento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              8. Monitoramento e Observabilidade
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Utilizamos ferramentas de monitoramento (Sentry e PostHog) para
              identificar e corrigir erros, analisar padrões de uso e melhorar
              a plataforma. Esses serviços coletam dados anonimizados de uso,
              sem acesso ao conteúdo dos seus documentos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Seus Direitos (LGPD)</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem
              direito a acessar, corrigir e excluir seus dados pessoais a
              qualquer momento. Disponibilizamos um endpoint automatizado de
              exclusão total de dados (<code>DELETE /api/user</code>) que remove
              todos os seus documentos, chunks, flashcards, progresso, logs de
              IA e perfil da plataforma. Para exercer esses direitos, você pode
              utilizar a opção &quot;Excluir conta&quot; na página Meu Plano ou
              entrar em contato pelo email abaixo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Modificações</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Podemos atualizar estes termos periodicamente. Alterações
              significativas serão comunicadas por email com no mínimo 7 dias de
              antecedência.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Contato</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Dúvidas sobre estes termos? Entre em contato pelo email{" "}
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
