export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-16 md:pt-36">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          Política de Privacidade
        </h1>
        <p className="mt-4 text-muted-foreground">
          Última atualização: Junho de 2026
        </p>

        <div className="mt-12 space-y-10 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">
              1. Dados que Coletamos
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Coletamos apenas os dados necessários para o funcionamento da
              plataforma: email, nome, e os PDFs e documentos que você envia.
              Não vendemos seus dados para terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Como Usamos seus Dados</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Utilizamos seus dados exclusivamente para fornecer os serviços da
              Trilha: processamento de documentos, geração de cronogramas
              e flashcards inteligentes. Seus documentos são
              processados pela IA (Google Gemini) e armazenados de forma segura
              no Supabase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Armazenamento e Segurança</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Seus dados são armazenados no Supabase, com criptografia em
              trânsito e em repouso. Utilizamos Row Level Security (RLS) para
              garantir que apenas você acesse seus próprios dados. O acesso de
              administradores da plataforma é restrito a membros autorizados e
              registrado em logs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              4. IA e Processamento
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Utilizamos a API do Google Gemini com modelo Gemma 4 26B (Generate Content
              API) para processamento de linguagem natural dos seus documentos.
              Os dados enviados para a API são apenas o texto extraído do
              documento, sem informações pessoais identificáveis. Implementamos
              um sistema de cache de outputs (tabela <code>ai_cache</code>) que
              armazena temporariamente resultados de IA para evitar
              reprocessamento desnecessário. Esse cache expira automaticamente
              em até 7 dias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              5. Monitoramento (Sentry e PostHog)
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Utilizamos Sentry para monitoramento de erros e PostHog para
              análise anônima de uso da plataforma. Essas ferramentas nos
              ajudam a identificar bugs, entender como os usuários interagem
              com a plataforma e melhorar a experiência. Nenhum conteúdo de
              documentos é enviado para esses serviços — apenas dados de
              navegação anonimizados (páginas acessadas, tempo de uso, tipo de
              navegador).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              6. Rastreamento de Custo de IA
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Para garantir a sustentabilidade do serviço e evitar abusos,
              rastreamos o número de tokens processados por chamada de IA e o
              custo estimado associado. Esses dados são armazenados na tabela
              <code>ai_usage_log</code> e associados à sua conta. Você pode
              visualizar seu consumo na página &quot;Custos de IA&quot; do
              dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              7. Seus Direitos (LGPD) — Exclusão de Dados
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              De acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018),
              você tem os seguintes direitos:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li><strong>Acessar</strong> todos os dados que armazenamos sobre você.</li>
              <li><strong>Corrigir</strong> dados incompletos, inexatos ou desatualizados.</li>
              <li><strong>Excluir</strong> permanentemente sua conta e todos os dados associados.</li>
              <li><strong>Revogar</strong> consentimento para processamento de dados a qualquer momento.</li>
              <li><strong>Portabilidade</strong> dos dados para outro fornecedor, quando aplicável.</li>
            </ul>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Para exercer o direito de exclusão, você pode utilizar a opção
              &quot;Excluir conta&quot; disponível na página
              &quot;Meu Plano&quot; do dashboard, que aciona automaticamente a
              remoção de todos os seus dados (documentos, flashcards, progresso,
              logs de IA, perfil e autenticação). Alternativamente, envie um
              email para{" "}
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
            <h2 className="text-xl font-semibold">8. Cookies</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Utilizamos cookies essenciais para autenticação via Supabase.
              Não utilizamos cookies de rastreamento ou publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              9. Alterações nesta Política
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Podemos atualizar esta política periodicamente. Alterações
              significativas serão comunicadas por email com no mínimo 7 dias de
              antecedência.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Contato</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Dúvidas sobre privacidade ou proteção de dados? Entre em contato
              pelo email{" "}
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
