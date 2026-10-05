import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { configuracaoDoNivel, normalizarNivel, proximoNivel, NIVEL_MAXIMO } = require("../modo.js");

test("níveis válidos e inválidos", () => {
  assert.equal(normalizarNivel(2), 2);
  assert.equal(normalizarNivel("1"), 1);
  assert.equal(normalizarNivel(undefined), 0);
  assert.equal(normalizarNivel(-1), 0);
  assert.equal(normalizarNivel(99), 0);
  assert.equal(normalizarNivel("abc"), 0);
});

test("a escada sobe um nível por vez e para no máximo", () => {
  assert.equal(proximoNivel(0), 1);
  assert.equal(proximoNivel(1), 2);
  assert.equal(proximoNivel(2), 3);
  assert.equal(proximoNivel(NIVEL_MAXIMO), NIVEL_MAXIMO);
});

test("nível 0 não muda nada; cada nível acrescenta proteções", () => {
  const n0 = configuracaoDoNivel(0);
  assert.deepEqual(n0.switches, []);
  assert.equal(n0.semSandbox, false);

  const n1 = configuracaoDoNivel(1);
  const nomes1 = n1.switches.map((s) => s[0]);
  assert.ok(nomes1.includes("disable-gpu") && nomes1.includes("disable-software-rasterizer"));
  assert.deepEqual(n1.switches.find((s) => s[0] === "disable-features"), ["disable-features", "RendererCodeIntegrity"]);
  assert.equal(n1.semSandbox, false);

  const n2 = configuracaoDoNivel(2);
  assert.ok(n2.switches.some((s) => s[0] === "no-sandbox"));
  assert.equal(n2.semSandbox, true);

  const n3 = configuracaoDoNivel(3);
  assert.ok(n3.switches.some((s) => s[0] === "in-process-gpu"));
  assert.equal(n3.switches.filter((s) => s[0] === "disable-features").length, 1); // um só, com tudo junto
  assert.match(n3.switches.find((s) => s[0] === "disable-features")[1], /RendererCodeIntegrity,IsolateOrigins,site-per-process/);
});
