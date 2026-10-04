// Funções puras (sem Electron) para validar o endereço do sistema.

const MARCA_PADRAO = "COLE-AQUI";

/** Retorna { ok: true, url } ou { ok: false, erro } */
function validarUrl(texto) {
  const bruto = String(texto ?? "").trim();
  if (!bruto || bruto.includes(MARCA_PADRAO)) {
    return { ok: false, erro: "O endereço do sistema ainda não foi configurado no arquivo config.json." };
  }
  let u;
  try {
    u = new URL(bruto);
  } catch {
    return { ok: false, erro: `Endereço inválido no config.json: ${bruto}` };
  }
  if (u.protocol !== "https:") {
    return { ok: false, erro: "O endereço do sistema precisa começar com https://" };
  }
  return { ok: true, url: u.toString() };
}

/** true se "destino" pertence ao mesmo site do sistema. */
function mesmaOrigem(destino, base) {
  try {
    return new URL(destino).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

module.exports = { validarUrl, mesmaOrigem };
