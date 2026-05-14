import { TomassiniGeneticArena } from "./src/ga-core.js";

// Pequena bateria deterministica para verificar se a busca continua convergindo.
const RUNS = 24;
const GENERATIONS = 260;
const SUCCESS_THRESHOLD = 0.05;

let successes = 0;
const bestCosts = [];

for (let seed = 1; seed <= RUNS; seed += 1) {
  const arena = new TomassiniGeneticArena({ seed });
  const finalSnapshot = arena.run(GENERATIONS);
  bestCosts.push(finalSnapshot.bestEver.cost);

  if (finalSnapshot.bestEver.cost <= SUCCESS_THRESHOLD) {
    successes += 1;
  }
}

const averageBest =
  bestCosts.reduce((sum, value) => sum + value, 0) / bestCosts.length;
const worstBest = Math.max(...bestCosts);

// Falha quando a taxa de sucesso ou a qualidade media pioram alem do tolerado.
console.log(
  JSON.stringify(
    {
      runs: RUNS,
      generations: GENERATIONS,
      successes,
      successThreshold: SUCCESS_THRESHOLD,
      averageBest,
      worstBest,
    },
    null,
    2,
  ),
);

if (successes < RUNS * 0.85 || averageBest > 0.03 || worstBest > 0.15) {
  process.exitCode = 1;
}
