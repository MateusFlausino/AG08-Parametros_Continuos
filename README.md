# Trabalho 08 - Parametros Continuos

Aplicacao interativa desenvolvida para demonstrar a minimizacao da funcao de Rastrigin por meio de Algoritmo Genetico (AG) com representacao real. O projeto apresenta a evolucao de uma populacao de candidatos no plano `x1`/`x2`, mostra os melhores individuos de cada geracao e permite executar a busca manualmente ou em modo automatico.

## Problema

O objetivo e encontrar o menor valor da funcao de Rastrigin para `n = 2`:

```text
f(x) = 10n + soma(xi^2 - 10 cos(2*pi*xi))
```

considerando:

- Dimensao: `n = 2`
- Dominio de busca: `-5.12 <= xi <= 5.12`
- Otimo global conhecido: `x = (0, 0)`
- Valor minimo esperado: `f(x) = 0`

A funcao de Rastrigin e multimodal: possui muitos minimos locais distribuidos pelo espaco de busca. Esse comportamento torna o problema adequado para testar algoritmos evolutivos, pois a populacao precisa equilibrar exploracao do dominio e intensificacao nas regioes de melhor custo.

## Solucao utilizada

A solucao implementa um Algoritmo Genetico com individuos representados por vetores reais. Cada individuo possui dois genes, `x1` e `x2`, avaliados diretamente na funcao objetivo. Como se trata de um problema de minimizacao, individuos com menor valor de `f(x)` recebem maior pontuacao de selecao.

Fluxo principal do algoritmo:

1. Geracao de uma populacao inicial aleatoria no intervalo permitido.
2. Avaliacao do custo `f(x1, x2)` de cada individuo.
3. Conversao do custo em pontuacao de selecao, favorecendo menores valores.
4. Selecao de pais por roleta ponderada.
5. Recombinacao por crossover aritmetico entre vetores reais.
6. Mutacao gaussiana nos genes, respeitando os limites do dominio.
7. Substituicao da populacao e repeticao do processo por novas geracoes.

Parametros padrao:

| Parametro | Valor |
| --- | ---: |
| Dimensoes | 2 |
| Limite inferior | -5.12 |
| Limite superior | 5.12 |
| Tamanho da populacao | 50 |
| Taxa de crossover | 0.75 |
| Taxa de mutacao | 0.18 |
| Escala da mutacao | 0.6 |
| Geracoes para verificacao | 260 |

A interface mostra um mapa de calor da funcao no plano, a distribuicao da populacao, o melhor individuo da geracao, o melhor global encontrado, a media da geracao e uma medida de diversidade baseada na distancia media dos individuos ate a origem. Tambem ha um grafico de desempenho que acompanha, geracao a geracao, o melhor valor global encontrado e a media da populacao.

## Tecnologias

- HTML, CSS e JavaScript
- Node.js para servidor estatico local
- Electron para empacotamento desktop

## Como executar

Instale as dependencias:

```bash
npm install
```

Execute no navegador:

```bash
npm start
```

Depois acesse o endereco exibido no terminal, normalmente `http://127.0.0.1:4173`.

Para abrir como aplicativo desktop:

```bash
npm run desktop
```

Para gerar uma versao portatil para Windows:

```bash
npm run dist
```

## Verificacao

O projeto possui uma rotina simples de verificacao deterministica que executa varias rodadas com seeds fixas e valida se o AG continua convergindo para regioes proximas do minimo conhecido.

```bash
npm run verify
```

## Estrutura

- `src/ga-core.js`: implementacao do algoritmo genetico e avaliacao da funcao.
- `src/app.js`: integracao da simulacao com a interface web.
- `index.html`: estrutura da tela.
- `styles.css`: estilos da aplicacao.
- `server.js`: servidor estatico local.
- `electron/main.js`: inicializacao da aplicacao desktop.
- `verify.js`: verificacao automatizada da convergencia.
