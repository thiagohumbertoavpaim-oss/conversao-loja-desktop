// "Modos de compatibilidade": quando a janela do aplicativo trava ao abrir (comum com antivírus
// ou placa de vídeo problemáticos), o aplicativo reinicia sozinho no próximo modo, até achar um que funcione.
// Funções puras (sem Electron) para poderem ser testadas.

const NIVEL_MAXIMO = 3;

function normalizarNivel(valor) {
  const n = Number.parseInt(valor, 10);
  return Number.isInteger(n) && n >= 0 && n <= NIVEL_MAXIMO ? n : 0;
}

function proximoNivel(nivel) {
  return Math.min(normalizarNivel(nivel) + 1, NIVEL_MAXIMO);
}

/**
 * Nível 0: padrão (sem aceleração de vídeo, definida no main.js).
 * Nível 1: sem nenhum uso da placa de vídeo + desliga a proteção de código do renderizador (conflita com alguns antivírus).
 * Nível 2: além disso, sem o "sandbox" do Chromium.
 * Nível 3: além disso, modo mais simples de processos de vídeo e de isolamento.
 */
function configuracaoDoNivel(valor) {
  const nivel = normalizarNivel(valor);
  const switches = [];
  const desligarRecursos = [];

  if (nivel >= 1) {
    switches.push(["disable-gpu"], ["disable-software-rasterizer"], ["disable-gpu-compositing"]);
    desligarRecursos.push("RendererCodeIntegrity");
  }
  if (nivel >= 2) {
    switches.push(["no-sandbox"]);
  }
  if (nivel >= 3) {
    switches.push(["in-process-gpu"], ["disable-gpu-sandbox"]);
    desligarRecursos.push("IsolateOrigins", "site-per-process");
  }
  if (desligarRecursos.length > 0) switches.push(["disable-features", desligarRecursos.join(",")]);

  return { nivel, switches, semSandbox: nivel >= 2 };
}

module.exports = { NIVEL_MAXIMO, normalizarNivel, proximoNivel, configuracaoDoNivel };
