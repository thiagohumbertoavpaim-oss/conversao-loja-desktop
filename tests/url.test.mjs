import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { validarUrl, mesmaOrigem } = require("../url.js");

test("endereço padrão (não configurado) é recusado", () => {
  const r = validarUrl("COLE-AQUI-O-ENDERECO-DO-SISTEMA");
  assert.equal(r.ok, false);
  assert.match(r.erro, /não foi configurado/);
  assert.equal(validarUrl("").ok, false);
  assert.equal(validarUrl(undefined).ok, false);
});

test("só aceita https e endereço válido", () => {
  assert.equal(validarUrl("http://conversao.pages.dev").ok, false);
  assert.equal(validarUrl("javascript:alert(1)").ok, false);
  assert.equal(validarUrl("conversao.pages.dev").ok, false);
  const ok = validarUrl("  https://conversao-loja.pages.dev  ");
  assert.equal(ok.ok, true);
  assert.equal(ok.url, "https://conversao-loja.pages.dev/");
});

test("mesma origem: o sistema não sai do próprio endereço", () => {
  const base = "https://conversao-loja.pages.dev/";
  assert.equal(mesmaOrigem("https://conversao-loja.pages.dev/painel/", base), true);
  assert.equal(mesmaOrigem("https://outro-site.com/", base), false);
  assert.equal(mesmaOrigem("https://conversao-loja.pages.dev.golpe.com/", base), false);
  assert.equal(mesmaOrigem("lixo", base), false);
});

test("config.json existe e tem o campo url", () => {
  const cfg = JSON.parse(fs.readFileSync(new URL("../config.json", import.meta.url), "utf8"));
  assert.ok("url" in cfg);
});

test("package.json: instalador NSIS com atalho na área de trabalho e ícone", () => {
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.main, "main.js");
  assert.equal(pkg.build.nsis.createDesktopShortcut, true);
  assert.equal(pkg.build.nsis.createStartMenuShortcut, true);
  assert.equal(pkg.build.win.icon, "build/icon.ico");
  for (const f of ["main.js", "preload.js", "url.js", "offline.html", "config.json"]) {
    assert.ok(pkg.build.files.includes(f), f);
    assert.ok(fs.existsSync(new URL("../" + f, import.meta.url)), f);
  }
  assert.ok(fs.existsSync(new URL("../build/icon.ico", import.meta.url)));
});
