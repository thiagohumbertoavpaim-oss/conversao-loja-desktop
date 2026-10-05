// Conversão da Loja — aplicativo para Windows.
// Só abre o endereço do sistema em uma janela própria (sem barra de endereço, abas ou menus).
// Não altera o sistema: login, Supabase e funções vêm do próprio site.

const { app, BrowserWindow, Menu, ipcMain, session, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { validarUrl, mesmaOrigem } = require("./url");

// Em alguns computadores (placa de vídeo antiga ou driver com problema) a janela abre toda em branco.
// Desenhar sem aceleração de vídeo evita isso e é suficiente para este sistema.
app.disableHardwareAcceleration();

const TITULO = "Conversão da Loja";
const TEMPO_MAXIMO_CARGA_MS = 25000;
let janela = null;
let urlSistema = null;
let timerReconectar = null;
let timerCarga = null;

// ---------- registro de diagnóstico (para descobrir problemas) ----------
function arquivoLog() {
  return path.join(app.getPath("userData"), "diagnostico.log");
}

function registrar(texto) {
  try {
    fs.appendFileSync(arquivoLog(), `${new Date().toISOString()} ${texto}\n`);
  } catch {
    // sem log, sem problema
  }
}

function iniciarLog() {
  try {
    const arq = arquivoLog();
    if (fs.existsSync(arq) && fs.statSync(arq).size > 200000) fs.writeFileSync(arq, "");
  } catch {
    // ignora
  }
  registrar(`--- aplicativo aberto (versão ${app.getVersion()}, electron ${process.versions.electron}) ---`);
}

// ---------- configuração ----------
function lerConfig() {
  try {
    const arquivo = path.join(__dirname, "config.json");
    return validarUrl(JSON.parse(fs.readFileSync(arquivo, "utf8")).url);
  } catch {
    return { ok: false, erro: "Não foi possível ler o arquivo config.json." };
  }
}

// ---------- telas ----------
function mostrarOffline(erro) {
  if (!janela || janela.isDestroyed()) return;
  const arquivo = path.join(__dirname, "offline.html");
  janela.loadFile(arquivo, erro ? { query: { erro } } : undefined);
}

function carregarSistema() {
  if (!janela || janela.isDestroyed() || !urlSistema) return;
  registrar(`carregando ${urlSistema}`);
  clearTimeout(timerCarga);
  janela.loadURL(urlSistema).catch(() => {
    // o erro é tratado em did-fail-load
  });
  // Se o site não responder em tempo razoável, mostra a tela de aviso em vez de ficar em branco.
  timerCarga = setTimeout(() => {
    if (!janela || janela.isDestroyed()) return;
    if (janela.webContents.getURL().startsWith("file:")) return;
    if (janela.webContents.isLoading()) {
      registrar("demorou demais para carregar");
      mostrarOffline("O sistema está demorando para responder. Verifique a internet.");
      agendarReconexao();
    }
  }, TEMPO_MAXIMO_CARGA_MS);
}

function agendarReconexao() {
  clearInterval(timerReconectar);
  timerReconectar = setInterval(() => {
    if (!janela || janela.isDestroyed()) return clearInterval(timerReconectar);
    if (janela.webContents.getURL().startsWith("file:")) carregarSistema();
    else clearInterval(timerReconectar);
  }, 8000);
}

function criarJanela() {
  const config = lerConfig();
  urlSistema = config.ok ? config.url : null;
  registrar(config.ok ? `endereço configurado: ${urlSistema}` : `config inválida: ${config.erro}`);

  janela = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 360,
    minHeight: 600,
    show: false,
    title: TITULO,
    backgroundColor: "#f1f3f7",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: true, // só abre com F12 (para diagnóstico)
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(null); // sem menu (Arquivo, Editar...) nem barra de endereço
  janela.removeMenu();
  janela.maximize();
  janela.once("ready-to-show", () => janela && janela.show());
  // garantia: se por algum motivo o evento acima não vier, mostra a janela mesmo assim
  setTimeout(() => {
    if (janela && !janela.isDestroyed() && !janela.isVisible()) janela.show();
  }, 4000);

  // Mantém o título fixo (o site muda o título da página)
  janela.on("page-title-updated", (ev) => ev.preventDefault());

  // Links para outros sites abrem no navegador padrão; o sistema nunca sai do próprio endereço.
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url) && !mesmaOrigem(url, urlSistema || "")) shell.openExternal(url);
    return { action: "deny" };
  });
  janela.webContents.on("will-navigate", (ev, destino) => {
    if (destino.startsWith("file:")) return; // tela "sem internet"
    if (urlSistema && !mesmaOrigem(destino, urlSistema)) {
      ev.preventDefault();
      if (/^https:\/\//i.test(destino)) shell.openExternal(destino);
    }
  });

  // Atalhos: F5 / Ctrl+R atualizam; F12 abre o diagnóstico; Ctrl+Shift+L mostra a pasta do registro.
  janela.webContents.on("before-input-event", (ev, input) => {
    if (input.type !== "keyDown") return;
    const ctrl = input.control || input.meta;
    const tecla = String(input.key || "").toLowerCase();
    if (input.key === "F5" || (ctrl && tecla === "r")) {
      ev.preventDefault();
      if (janela.webContents.getURL().startsWith("file:")) carregarSistema();
      else janela.webContents.reload();
    } else if (input.key === "F12" || (ctrl && input.shift && tecla === "i")) {
      ev.preventDefault();
      janela.webContents.toggleDevTools();
    } else if (ctrl && input.shift && tecla === "l") {
      ev.preventDefault();
      shell.showItemInFolder(arquivoLog());
    }
  });

  // Registro do que acontece (ajuda a descobrir problemas)
  janela.webContents.on("did-finish-load", () => {
    clearTimeout(timerCarga);
    registrar(`carregou: ${janela.webContents.getURL()}`);
  });
  janela.webContents.on("console-message", (evento, nivelAntigo, mensagemAntiga) => {
    const nivel = String(evento?.level ?? nivelAntigo);
    const mensagem = evento?.message ?? mensagemAntiga;
    if (["error", "warning", "2", "3"].includes(nivel)) registrar(`console[${nivel}]: ${mensagem}`);
  });
  janela.webContents.on("render-process-gone", (_ev, detalhes) => {
    registrar(`processo da janela parou: ${detalhes?.reason}`);
    if (detalhes?.reason !== "clean-exit") setTimeout(carregarSistema, 2000);
  });
  janela.webContents.on("unresponsive", () => registrar("janela sem resposta"));

  // Sem internet ou site fora do ar: mostra uma tela amigável e tenta de novo sozinho.
  janela.webContents.on("did-fail-load", (_ev, codigo, descricao, urlFalhou, ehPrincipal) => {
    if (!ehPrincipal || codigo === -3) return; // -3 = carregamento cancelado
    if (urlFalhou && urlFalhou.startsWith("file:")) return;
    clearTimeout(timerCarga);
    registrar(`falha ao carregar (${codigo} ${descricao}): ${urlFalhou}`);
    mostrarOffline();
    agendarReconexao();
  });

  janela.on("closed", () => {
    clearInterval(timerReconectar);
    clearTimeout(timerCarga);
    janela = null;
  });

  if (!config.ok) mostrarOffline(config.erro);
  else carregarSistema();
}

// Só uma janela do aplicativo por vez: abrir de novo traz a janela que já existe.
const principal = app.requestSingleInstanceLock();
if (!principal) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!janela) return;
    if (janela.isMinimized()) janela.restore();
    janela.focus();
  });

  app.on("child-process-gone", (_ev, detalhes) => {
    registrar(`processo interno parou: ${detalhes?.type} ${detalhes?.reason}`);
  });

  app.whenReady().then(() => {
    iniciarLog();
    // O sistema não precisa de câmera, microfone, localização etc.
    session.defaultSession.setPermissionRequestHandler((_wc, _permissao, resposta) => resposta(false));
    ipcMain.on("tentar-novamente", carregarSistema);
    criarJanela();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) criarJanela();
    });
  });

  app.on("window-all-closed", () => app.quit());
}
