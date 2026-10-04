// Conversão da Loja — aplicativo para Windows.
// Só abre o endereço do sistema em uma janela própria (sem barra de endereço, abas ou menus).
// Não altera o sistema: login, Supabase e funções vêm do próprio site.

const { app, BrowserWindow, Menu, ipcMain, session, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { validarUrl, mesmaOrigem } = require("./url");

const TITULO = "Conversão da Loja";
let janela = null;
let urlSistema = null;
let timerReconectar = null;

function lerConfig() {
  try {
    const arquivo = path.join(__dirname, "config.json");
    return validarUrl(JSON.parse(fs.readFileSync(arquivo, "utf8")).url);
  } catch {
    return { ok: false, erro: "Não foi possível ler o arquivo config.json." };
  }
}

function mostrarOffline(erro) {
  if (!janela || janela.isDestroyed()) return;
  const arquivo = path.join(__dirname, "offline.html");
  janela.loadFile(arquivo, erro ? { query: { erro } } : undefined);
}

function carregarSistema() {
  if (!janela || janela.isDestroyed() || !urlSistema) return;
  janela.loadURL(urlSistema);
}

function criarJanela() {
  const config = lerConfig();
  urlSistema = config.ok ? config.url : null;

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
      devTools: false,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(null); // sem menu (Arquivo, Editar...) nem barra de endereço
  janela.removeMenu();
  janela.maximize();
  janela.once("ready-to-show", () => janela.show());

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

  // F5 / Ctrl+R atualizam; Ctrl + roda do mouse / Ctrl +/- ajustam o zoom.
  janela.webContents.on("before-input-event", (ev, input) => {
    if (input.type !== "keyDown") return;
    const ctrl = input.control || input.meta;
    if (input.key === "F5" || (ctrl && input.key.toLowerCase() === "r")) {
      ev.preventDefault();
      if (janela.webContents.getURL().startsWith("file:")) carregarSistema();
      else janela.webContents.reload();
    }
  });

  // Sem internet ou site fora do ar: mostra uma tela amigável e tenta de novo sozinho.
  janela.webContents.on("did-fail-load", (_ev, codigo, _desc, urlFalhou, ehPrincipal) => {
    if (!ehPrincipal || codigo === -3) return; // -3 = carregamento cancelado
    if (urlFalhou && urlFalhou.startsWith("file:")) return;
    mostrarOffline();
    clearInterval(timerReconectar);
    timerReconectar = setInterval(() => {
      if (!janela || janela.isDestroyed()) return clearInterval(timerReconectar);
      if (janela.webContents.getURL().startsWith("file:")) carregarSistema();
      else clearInterval(timerReconectar);
    }, 8000);
  });

  janela.on("closed", () => {
    clearInterval(timerReconectar);
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

  app.whenReady().then(() => {
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
