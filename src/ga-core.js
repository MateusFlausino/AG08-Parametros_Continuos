export const KNOWN_OPTIMUM = {
  x: 420.968746,
  value: 0,
};

export const DEFAULT_CONFIG = {
  bits: 10,
  lowerBound: 0,
  upperBound: 512,
  populationSize: 50,
  crossoverRate: 0.6,
  mutationRate: 0.01,
  maxGenerations: 70,
};

const FITNESS_EPSILON = 1e-9;

// Gerador pseudoaleatorio deterministico para reproduzir rodadas por seed.
export function createMulberry32(seed) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeSeed(seed) {
  if (Number.isFinite(seed)) {
    return Math.abs(Math.trunc(seed)) || 1;
  }

  return Date.now() % 2147483647 || 1;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function evaluateObjective(x) {
  return 418.9828872724338 - x * Math.sin(Math.sqrt(Math.abs(x)));
}

// Traduz o genoma binario para o intervalo continuo usado pela funcao objetivo.
export function decodeGenome(genome, config) {
  const integer = Number.parseInt(genome, 2);
  const maxInteger = 2 ** config.bits - 1;
  const ratio = integer / maxInteger;
  return config.lowerBound + ratio * (config.upperBound - config.lowerBound);
}

// Cria individuos aleatorios respeitando a quantidade de bits configurada.
function randomGenome(bitCount, rng) {
  let genome = "";

  for (let index = 0; index < bitCount; index += 1) {
    genome += rng() < 0.5 ? "0" : "1";
  }

  return genome;
}

function shuffle(values, rng) {
  const clone = [...values];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return clone;
}

// Aplica mutacao bit a bit e devolve quantas trocas realmente aconteceram.
function mutationStep(genome, mutationRate, rng) {
  let mutated = "";
  let mutations = 0;

  for (const gene of genome) {
    if (rng() <= mutationRate) {
      mutated += gene === "0" ? "1" : "0";
      mutations += 1;
    } else {
      mutated += gene;
    }
  }

  return { genome: mutated, mutations };
}

// Faz crossover de um ponto para recombinar dois pais em dois filhos.
function crossoverStep(parentA, parentB, crossoverRate, rng) {
  if (rng() > crossoverRate) {
    return {
      genomes: [parentA, parentB],
      used: false,
      point: null,
    };
  }

  const point = 1 + Math.floor(rng() * (parentA.length - 1));
  const childA = `${parentA.slice(0, point)}${parentB.slice(point)}`;
  const childB = `${parentB.slice(0, point)}${parentA.slice(point)}`;

  return {
    genomes: [childA, childB],
    used: true,
    point,
  };
}

// Como o problema eh de minimizacao, convertemos custo menor em score maior.
function toSelectionScores(costs) {
  const worstCost = Math.max(...costs);
  return costs.map((cost) => worstCost - cost + FITNESS_EPSILON);
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export class TomassiniGeneticArena {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.seed = normalizeSeed(config.seed);
    this.rng = createMulberry32(this.seed);
    this.population = [];
    this.generation = 0;
    this.bestEver = null;
    this.lastSnapshot = null;
    this.reset(this.seed);
  }

  // Reinicia a populacao inteira para uma nova rodada reproduzivel por seed.
  reset(seed = Date.now()) {
    this.seed = normalizeSeed(seed);
    this.rng = createMulberry32(this.seed);
    this.generation = 0;
    this.bestEver = null;
    this.population = Array.from(
      { length: this.config.populationSize },
      () => randomGenome(this.config.bits, this.rng),
    );

    return this.captureSnapshot({
      trigger: "reset",
      meta: { crossoverPairs: 0, mutations: 0 },
    });
  }

  // Consolida tudo que a interface precisa saber sobre o estado atual da arena.
  captureSnapshot({ trigger, meta }) {
    const evaluated = this.population.map((genome, index) => {
      const x = decodeGenome(genome, this.config);
      const cost = evaluateObjective(x);
      return {
        id: index + 1,
        genome,
        x,
        cost,
      };
    });

    const scores = toSelectionScores(evaluated.map((entry) => entry.cost));
    for (let index = 0; index < evaluated.length; index += 1) {
      evaluated[index].selectionScore = scores[index];
    }

    // O leaderboard e a melhor solucao historica sao derivados do mesmo conjunto avaliado.
    const leaderboard = [...evaluated].sort((left, right) => left.cost - right.cost);
    const best = { ...leaderboard[0] };
    const averageCost = average(evaluated.map((entry) => entry.cost));
    const diversity = new Set(evaluated.map((entry) => entry.genome)).size / evaluated.length;
    const championDistance = Math.abs(best.x - KNOWN_OPTIMUM.x);

    if (!this.bestEver || best.cost < this.bestEver.cost) {
      this.bestEver = { ...best, generation: this.generation };
    }

    const snapshot = {
      generation: this.generation,
      config: { ...this.config },
      evaluated,
      leaderboard: leaderboard.slice(0, 5),
      best,
      bestEver: { ...this.bestEver },
      averageCost,
      diversity,
      championDistance,
      objectiveLabel: "418.982887 - x * sin(sqrt(|x|))",
      trigger,
      meta,
    };

    this.lastSnapshot = snapshot;
    return snapshot;
  }

  // Seleciona pais por roleta ponderada a partir do score calculado para cada individuo.
  selectParents(evaluated) {
    const totalScore = evaluated.reduce((sum, entry) => sum + entry.selectionScore, 0);
    const cumulative = [];
    let running = 0;

    for (const entry of evaluated) {
      running += entry.selectionScore;
      cumulative.push(running);
    }

    if (totalScore <= FITNESS_EPSILON) {
      return shuffle(evaluated.map((entry) => entry.genome), this.rng);
    }

    const parents = [];

    // Cada vaga da nova geracao sorteia um pai de forma independente.
    for (let slot = 0; slot < this.config.populationSize; slot += 1) {
      const draw = this.rng() * totalScore;
      let chosenIndex = 0;

      while (chosenIndex < cumulative.length && draw > cumulative[chosenIndex]) {
        chosenIndex += 1;
      }

      parents.push(evaluated[clamp(chosenIndex, 0, evaluated.length - 1)].genome);
    }

    return parents;
  }

  // Executa uma geracao completa: selecao, crossover, mutacao e nova avaliacao.
  step(overrides = {}) {
    const generationConfig = {
      crossoverRate: overrides.crossoverRate ?? this.config.crossoverRate,
      mutationRate: overrides.mutationRate ?? this.config.mutationRate,
    };

    const baseSnapshot =
      this.lastSnapshot ||
      this.captureSnapshot({
        trigger: "resume",
        meta: { crossoverPairs: 0, mutations: 0 },
      });

    const selectedParents = this.selectParents(baseSnapshot.evaluated);
    const shuffledParents = shuffle(selectedParents, this.rng);
    const nextPopulation = [];
    let crossoverPairs = 0;
    let mutations = 0;

    // Os pais embaralhados sao consumidos em pares para recombinacao.
    for (let index = 0; index < shuffledParents.length; index += 2) {
      const parentA = shuffledParents[index];
      const parentB = shuffledParents[index + 1] ?? shuffledParents[0];
      const crossover = crossoverStep(
        parentA,
        parentB,
        generationConfig.crossoverRate,
        this.rng,
      );

      if (crossover.used) {
        crossoverPairs += 1;
      }

      for (const genome of crossover.genomes) {
        const mutated = mutationStep(genome, generationConfig.mutationRate, this.rng);
        mutations += mutated.mutations;
        nextPopulation.push(mutated.genome);

        if (nextPopulation.length === this.config.populationSize) {
          break;
        }
      }
    }

    this.population = nextPopulation;
    this.generation += 1;

    return this.captureSnapshot({
      trigger: "step",
      meta: {
        crossoverPairs,
        mutations,
        mutationRate: generationConfig.mutationRate,
      },
    });
  }

  // Roda varias geracoes em sequencia e devolve o ultimo snapshot observado.
  run(generations = this.config.maxGenerations) {
    let snapshot = this.lastSnapshot;

    for (let generation = 0; generation < generations; generation += 1) {
      snapshot = this.step();
    }

    return snapshot;
  }
}
