import {
  KNOWN_OPTIMUM,
  TomassiniGeneticArena,
  evaluateObjective,
} from "./ga-core.js";

// Reune todas as referencias da interface em um unico lugar.
const dom = {
  arenaCanvas: document.querySelector("#arenaCanvas"),
  autoButton: document.querySelector("#autoButton"),
  averageValue: document.querySelector("#averageValue"),
  bestFxValue: document.querySelector("#bestFxValue"),
  bestXValue: document.querySelector("#bestXValue"),
  diversityValue: document.querySelector("#diversityValue"),
  generationValue: document.querySelector("#generationValue"),
  leaderboard: document.querySelector("#leaderboard"),
  objectiveValue: document.querySelector("#objectiveValue"),
  populationInput: document.querySelector("#populationInput"),
  resetButton: document.querySelector("#resetButton"),
  speedSlider: document.querySelector("#speedSlider"),
  speedValue: document.querySelector("#speedValue"),
  statusBanner: document.querySelector("#statusBanner"),
  stepButton: document.querySelector("#stepButton"),
  studyFunctionValue: document.querySelector("#studyFunctionValue"),
};

const ctx = dom.arenaCanvas.getContext("2d");

// Estado da simulacao usado pelos controles e pelo renderer.
const state = {
  autoTimer: null,
  speed: Number(dom.speedSlider.value),
  arena: new TomassiniGeneticArena(),
};

function formatDecimal(value, digits = 3) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function normalizePopulationSize(value, fallback = state.arena.config.populationSize) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(2, Math.min(200, parsed));
}

function syncPopulationUi(populationSize) {
  if (document.activeElement !== dom.populationInput) {
    dom.populationInput.value = String(populationSize);
  }
}

// Ajusta o canvas para o tamanho visivel sem perder nitidez em telas HiDPI.
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const bounds = dom.arenaCanvas.getBoundingClientRect();
  dom.arenaCanvas.width = Math.floor(bounds.width * dpr);
  dom.arenaCanvas.height = Math.floor(bounds.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Atualiza os indicadores de texto com o snapshot mais recente da arena.
function updateHud(snapshot) {
  dom.generationValue.textContent = String(snapshot.generation);
  dom.bestXValue.textContent = `(${snapshot.best.genes.map((gene) => formatDecimal(gene, 3)).join("; ")})`;
  dom.bestFxValue.textContent = formatDecimal(snapshot.best.cost, 6);
  dom.averageValue.textContent = formatDecimal(snapshot.averageCost, 6);
  dom.diversityValue.textContent = formatPercent(snapshot.diversity);
  dom.objectiveValue.textContent = `Objetivo: minimizar ${snapshot.objectiveLabel}`;
  dom.statusBanner.textContent = `Melhor global em (${snapshot.bestEver.genes
    .map((gene) => formatDecimal(gene, 3))
    .join("; ")}).`;
  dom.studyFunctionValue.textContent = `f(x) = ${snapshot.objectiveLabel}`;
  syncPopulationUi(snapshot.config.populationSize);
}

// Mostra os cinco melhores individuos avaliados na geracao atual.
function renderLeaderboard(snapshot) {
  dom.leaderboard.innerHTML = snapshot.leaderboard
    .map(
      (entry, index) => `
        <article class="leader-card">
          <div class="leader-rank">${index + 1}</div>
          <div class="leader-meta">
            <strong>Agente ${entry.id}</strong>
            <span>x1 = ${formatDecimal(entry.genes[0], 3)} | x2 = ${formatDecimal(entry.genes[1], 3)}</span>
            <code>[${entry.genes.map((gene) => formatDecimal(gene, 4)).join("; ")}]</code>
          </div>
          <div class="leader-score">f(x) = ${formatDecimal(entry.cost, 6)}</div>
        </article>
      `,
    )
    .join("");
}

// Desenha a funcao objetivo, a populacao atual e o melhor individuo no canvas.
function drawArena(snapshot) {
  resizeCanvas();

  const width = dom.arenaCanvas.clientWidth;
  const height = dom.arenaCanvas.clientHeight;
  const padding = { top: 42, right: 24, bottom: 42, left: 54 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const minAxis = snapshot.config.lowerBound;
  const maxAxis = snapshot.config.upperBound;

  // Converte coordenadas do problema para o espaco visivel do canvas.
  const projectX = (x) => padding.left + ((x - minAxis) / (maxAxis - minAxis)) * chartWidth;
  const projectY = (y) =>
    padding.top + chartHeight - ((y - minAxis) / (maxAxis - minAxis)) * chartHeight;

  ctx.clearRect(0, 0, width, height);

  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "rgba(216, 229, 234, 0.96)");
  background.addColorStop(1, "rgba(240, 246, 248, 0.98)");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  // Mapa de calor da funcao Rastrigin em duas dimensoes.
  const grid = 54;
  const cellWidth = chartWidth / grid;
  const cellHeight = chartHeight / grid;
  for (let row = 0; row < grid; row += 1) {
    for (let column = 0; column < grid; column += 1) {
      const x1 = minAxis + (column / (grid - 1)) * (maxAxis - minAxis);
      const x2 = maxAxis - (row / (grid - 1)) * (maxAxis - minAxis);
      const value = evaluateObjective([x1, x2]);
      const intensity = Math.max(0, Math.min(1, value / 80));
      const hue = 202 - intensity * 168;
      const lightness = 72 - intensity * 24;
      ctx.fillStyle = `hsl(${hue} 72% ${lightness}%)`;
      ctx.fillRect(
        padding.left + column * cellWidth,
        padding.top + row * cellHeight,
        Math.ceil(cellWidth) + 1,
        Math.ceil(cellHeight) + 1,
      );
    }
  }

  // Grade leve para facilitar a leitura da superficie e dos individuos.
  ctx.strokeStyle = "rgba(19, 41, 61, 0.12)";
  ctx.lineWidth = 1;
  for (let index = 0; index <= 4; index += 1) {
    const y = padding.top + (chartHeight / 4) * index;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  for (let index = 0; index <= 4; index += 1) {
    const x = padding.left + (chartWidth / 4) * index;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
  }

  // Destaca a vizinhanca do minimo conhecido para comparar a busca com o alvo.
  const optimumX = projectX(KNOWN_OPTIMUM.genes[0]);
  const optimumY = projectY(KNOWN_OPTIMUM.genes[1]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(optimumX - 12, optimumY);
  ctx.lineTo(optimumX + 12, optimumY);
  ctx.moveTo(optimumX, optimumY - 12);
  ctx.lineTo(optimumX, optimumY + 12);
  ctx.stroke();

  snapshot.evaluated.forEach((entry) => {
    ctx.beginPath();
    ctx.fillStyle = "rgba(19, 41, 61, 0.68)";
    ctx.arc(projectX(entry.genes[0]), projectY(entry.genes[1]), 4.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.beginPath();
  ctx.fillStyle = "#f4d35e";
  ctx.arc(projectX(snapshot.best.genes[0]), projectY(snapshot.best.genes[1]), 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(244, 211, 94, 0.42)";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(projectX(snapshot.best.genes[0]), projectY(snapshot.best.genes[1]), 17, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#13293d";
  ctx.font = '700 13px "Trebuchet MS"';
  ctx.fillText("-5.12", padding.left - 14, height - padding.bottom + 22);
  ctx.fillText("5.12", width - padding.right - 24, height - padding.bottom + 22);
  ctx.fillText("x2", 16, padding.top - 10);
  ctx.fillText("x1", width - padding.right + 6, height - padding.bottom + 4);

  ctx.font = '700 12px "Trebuchet MS"';
  ctx.fillText("Minimo conhecido: (0; 0)", padding.left + 10, padding.top + 18);
}

function render(snapshot) {
  updateHud(snapshot);
  renderLeaderboard(snapshot);
  drawArena(snapshot);
}

function runStep() {
  const snapshot = state.arena.step();
  render(snapshot);
}

// Interrompe o loop automatico e devolve o controle manual para a interface.
function stopAutoPlay() {
  if (state.autoTimer) {
    window.clearInterval(state.autoTimer);
    state.autoTimer = null;
    dom.autoButton.textContent = "Execucao automatica";
  }
}

function applyPopulationSize(rawValue) {
  const populationSize = normalizePopulationSize(rawValue);
  stopAutoPlay();
  state.arena.config.populationSize = populationSize;
  dom.populationInput.value = String(populationSize);
  const snapshot = state.arena.reset();
  render(snapshot);
}

// Reinicia o loop automatico sempre com a velocidade atual do slider.
function startAutoPlay() {
  stopAutoPlay();
  const delay = Math.max(70, Math.round(1000 / state.speed));
  state.autoTimer = window.setInterval(runStep, delay);
  dom.autoButton.textContent = "Pausar";
}

dom.stepButton.addEventListener("click", runStep);

dom.autoButton.addEventListener("click", () => {
  if (state.autoTimer) {
    stopAutoPlay();
  } else {
    startAutoPlay();
  }
});

dom.resetButton.addEventListener("click", () => {
  stopAutoPlay();
  state.arena.config.populationSize = normalizePopulationSize(
    dom.populationInput.value,
    state.arena.config.populationSize,
  );
  const snapshot = state.arena.reset();
  render(snapshot);
});

dom.speedSlider.addEventListener("input", () => {
  state.speed = Number(dom.speedSlider.value);
  dom.speedValue.textContent = `${state.speed} geracoes/s`;
  if (state.autoTimer) {
    startAutoPlay();
  }
});

dom.populationInput.addEventListener("change", () => {
  applyPopulationSize(dom.populationInput.value);
});

window.addEventListener("resize", () => {
  if (state.arena.lastSnapshot) {
    drawArena(state.arena.lastSnapshot);
  }
});

dom.speedValue.textContent = `${state.speed} geracoes/s`;
syncPopulationUi(state.arena.config.populationSize);
render(state.arena.lastSnapshot);
