# Trabalho 02 - Minimizacao de funcoes

Aplicacao interativa desenvolvida para demonstrar a minimizacao de uma funcao por meio de Algoritmo Genetico (AG). O projeto apresenta a evolucao da populacao em um grafico, mostra os melhores individuos de cada geracao e permite executar a busca manualmente ou em modo automatico.

## Problema

O objetivo e encontrar o menor valor da funcao:

```text
f(x) = 418.982887 - x * sin(sqrt(|x|))
```

considerando:

- Dominio de busca: `0 <= x <= 512`
- Otimo global conhecido: `x ~= 420.968746`
- Valor minimo esperado: `f(x) ~= 0`

Esse tipo de funcao possui comportamento nao linear e regioes com vales locais, o que torna a busca por metodos puramente deterministas menos intuitiva para demonstracao. Por isso, foi usada uma abordagem evolutiva, capaz de explorar diferentes regioes do espaco de busca e melhorar a populacao ao longo das geracoes.

## Solucao utilizada

A solucao implementa um Algoritmo Genetico com individuos representados por genomas binarios. Cada genoma e decodificado para um valor real de `x` dentro do intervalo permitido, avaliado pela funcao objetivo e utilizado para formar novas geracoes.

Fluxo principal do algoritmo:

1. Geracao de uma populacao inicial aleatoria.
2. Decodificacao do genoma binario para um valor real de `x`.
3. Avaliacao do custo `f(x)` de cada individuo.
4. Conversao do custo em pontuacao de selecao, favorecendo menores valores de `f(x)`.
5. Selecao de pais por roleta ponderada.
6. Recombinacao por crossover de um ponto.
7. Mutacao bit a bit.
8. Substituicao da populacao e repeticao do processo por novas geracoes.

Parametros padrao:

| Parametro | Valor |
| --- | ---: |
| Bits por individuo | 10 |
| Limite inferior | 0 |
| Limite superior | 512 |
| Tamanho da populacao | 50 |
| Taxa de crossover | 0.6 |
| Taxa de mutacao | 0.01 |
| Geracoes para verificacao | 70 |

A interface mostra a curva da funcao, a distribuicao da populacao, o melhor individuo da geracao, o melhor global encontrado, a media da geracao e a diversidade dos genomas.

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
