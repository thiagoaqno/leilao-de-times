// Ângulos independentes dos retrovisores, em graus, guardados neste navegador.
import { store } from "./estado.js";
const CHAVE = "corrida:retrovisores", PADRAO = { esquerda: { horizontal: 15, vertical: -3 }, direita: { horizontal: 15, vertical: -3 } };
const limites = { horizontal: [-25, 40], vertical: [-25, 20] };
let dados = {};
try { const d = store.get(CHAVE); if (d && typeof d === "object") dados = d; } catch (_) {}
export function ajusteEspelho(lado) {
  const p = PADRAO[lado]; if (!p) return null;
  const d = dados[lado] || {}, r = {};
  for (const k of Object.keys(p)) { const n = Number(d[k]); r[k] = d[k] != null && Number.isFinite(n) ? Math.max(limites[k][0], Math.min(limites[k][1], n)) : p[k]; }
  return r;
}
export function definirEspelho(lado, campo, valor) {
  if (!PADRAO[lado] || !limites[campo]) return;
  const n = Number(valor); if (!Number.isFinite(n)) return;
  dados[lado] = { ...ajusteEspelho(lado), [campo]: Math.max(limites[campo][0], Math.min(limites[campo][1], n)) };
  try { store.set(CHAVE, dados); } catch (_) {}
  window.dispatchEvent(new Event("retrovisores:mudou"));
}
export function restaurarEspelhos() { dados = {}; try { store.set(CHAVE, dados); } catch (_) {} window.dispatchEvent(new Event("retrovisores:mudou")); }
