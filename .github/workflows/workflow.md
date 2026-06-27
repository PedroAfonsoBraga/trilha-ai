Usar GitHub Actions para garantir qualidade de código é uma estratégia excelente e, na maioria dos casos, **totalmente gratuita**, especialmente para projetos públicos .

A chave para manter tudo gratuito é entender os limites do plano gratuito e focar em ferramentas que não geram custos adicionais. O GitHub oferece 2.000 minutos grátis por mês para ações em repositórios privados (e minutos ilimitados para públicos), o que é suficiente para a maioria dos projetos .

### Como configurar um pipeline de qualidade gratuito

O processo envolve criar workflows (arquivos `.yml`) na pasta `.github/workflows/` do seu repositório. Cada workflow é composto por triggers (eventos que o iniciam), jobs (tarefas) e steps (ações individuais) .

Aqui estão os principais tipos de verificação que você pode adicionar, com ferramentas gratuitas:

| Etapa | Ferramentas Exemplo | Para que serve |
| :--- | :--- | :--- |
| **Estilo e Formatação** | Prettier, ESLint, Black, Ruff | Garantem que o código siga um padrão visual, evitando discussões e melhorando a legibilidade . |
| **Análise Estática** | ESLint, Ruff, Clippy | Encontram bugs, más práticas e problemas de segurança no código antes mesmo de ele ser executado . |
| **Testes Automatizados** | `pytest`, `unittest` (Python), `jest` (JS) | Executam a suíte de testes do seu projeto para garantir que novas alterações não quebrem funcionalidades existentes . |
| **Cobertura de Código** | `pytest-cov`, `coverage.py` | Medem a porcentagem do código que é coberta por testes, indicando a "qualidade" da sua suíte de testes . |
| **Segurança Avançada** | CodeQL, Semgrep, Snyk | Analisam o código em busca de vulnerabilidades de segurança conhecidas . |

### Exemplo prático de um workflow

Aqui está um exemplo de como pode ser um workflow para um projeto Python, que roda linters e testes:

```yaml
name: "Quality Checks"

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install ruff pytest
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi

      - name: Lint code with Ruff
        run: ruff check .

      - name: Test with pytest
        run: pytest
```

### Como manter o custo zero

Para garantir que você não seja cobrado, siga estas dicas:

*   **Prefira projetos públicos**: O uso de GitHub Actions em repositórios públicos é completamente gratuito e ilimitado .
*   **Monitore seus minutos**: Para repositórios privados, fique de olho no consumo de minutos no plano GitHub Free (2.000 minutos/mês) . Pipelines rápidos e bem otimizados geralmente não atingem esse limite .
*   **Evite ferramentas pagas**: Não use o **GitHub Code Quality**. Essa é uma funcionalidade paga que consumirá seus minutos do Actions, créditos de IA, e cobrará por "committers ativos" . Em vez disso, use as ferramentas gratuitas da comunidade, como Ruff, ESLint e CodeQL.
*   **Otimize seus workflows**: Use matrizes (`matrix`) para executar testes em paralelo e reduzir o tempo total de execução, e configure gatilhos para não rodar em branches desnecessários .

Com essas ferramentas, você pode construir um sistema de garantia de qualidade de código robusto, automatizado e que não custa nada. Se tiver um projeto específico em mente, posso detalhar mais algum desses pontos!