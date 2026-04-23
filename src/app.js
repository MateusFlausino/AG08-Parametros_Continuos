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
  dom.bestXValue.textContent = formatDecimal(snapshot.best.x, 3);
  dom.bestFxValue.textContent = formatDecimal(snapshot.best.cost, 6);
  dom.averageValue.textContent = formatDecimal(snapshot.averageCost, 6);
  dom.diversityValue.textContent = formatPercent(snapshot.diversity);
  dom.objectiveValue.textContent = `Objetivo: minimizar ${snapshot.objectiveLabel}`;
  dom.statusBanner.textContent = `Melhor global em x = ${formatDecimal(snapshot.bestEver.x, 3)}.`;
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
            <span>x = ${formatDecimal(entry.x, 3)}</span>
            <code>${entry.genome}</code>
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
  const minX = snapshot.config.lowerBound;
  const maxX = snapshot.config.upperBound;

  // Amostra a funcao objetivo para formar a curva de referencia do grafico.
  const samples = [];
  for (let index = 0; index <= 240; index += 1) {
    const x = minX + (index / 240) * (maxX - minX);
    samples.push({ x, y: evaluateObjective(x) });
  }

  const allValues = [
    ...samples.map((sample) => sample.y),
    ...snapshot.evaluated.map((entry) => entry.cost),
  ];
  const minY = Math.min(...allValues);
  const maxY = Math.max(...allValues);

  // Converte coordenadas do problema para o espaco visivel do canvas.
  const projectX = (x) => padding.left + ((x - minX) / (maxX - minX)) * chartWidth;
  const projectY = (y) =>
    padding.top + chartHeight - ((y - minY) / (maxY - minY || 1)) * chartHeight;

  ctx.clearRect(0, 0, width, height);

  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "rgba(216, 229, 234, 0.96)");
  background.addColorStop(1, "rgba(240, 246, 248, 0.98)");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  // Grade leve para facilitar a leitura da curva e dos individuos.
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
  ctx.fillStyle = "rgba(27, 152, 224, 0.14)";
  const optimumLeft = projectX(KNOWN_OPTIMUM.x - 6);
  const optimumRight = projectX(KNOWN_OPTIMUM.x + 6);
  ctx.fillRect(optimumLeft, padding.top, optimumRight - optimumLeft, chartHeight);

  ctx.beginPath();
  samples.forEach((sample, index) => {
    const x = projectX(sample.x);
    const y = projectY(sample.y);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#13293d";
  ctx.stroke();

  snapshot.evaluated.forEach((entry) => {
    ctx.beginPath();
    ctx.fillStyle = "rgba(36, 123, 160, 0.82)";
    ctx.arc(projectX(entry.x), projectY(entry.cost), 4.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.beginPath();
  ctx.fillStyle = "#1b98e0";
  ctx.arc(projectX(snapshot.best.x), projectY(snapshot.best.cost), 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(27, 152, 224, 0.28)";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(projectX(snapshot.best.x), projectY(snapshot.best.cost), 17, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#13293d";
  ctx.font = '700 13px "Trebuchet MS"';
  ctx.fillText("0", padding.left - 6, height - padding.bottom + 22);
  ctx.fillText("512", width - padding.right - 24, height - padding.bottom + 22);
  ctx.fillText("f(x)", 14, padding.top - 10);
  ctx.fillText("x", width - padding.right + 6, height - padding.bottom + 4);

  ctx.font = '700 12px "Trebuchet MS"';
  ctx.fillText(
    `Minimo conhecido: x ~= ${formatDecimal(KNOWN_OPTIMUM.x, 3)}`,
    padding.left + 10,
    padding.top + 18,
  );
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
