// Corrida da Galera — o fantasma do recorde (a sua melhor volta, salva neste navegador).
import { E, PISTAS, store, sNow, me } from "./estado.js";
import { groundH } from "./pista.js";
import { makeKart, poseKart, dropKart } from "./carros.js";
import { race } from "./jogo.js";

// ---------- FANTASMA DO RECORDE ----------
// A volta mais rápida que você já fez em cada pista fica salva neste navegador (posição a cada 0,1 s). Nas próximas
// corridas, um carro dourado transparente refaz essa volta junto com você, e o placar mostra quanto você está
// na frente (verde) ou atrás (vermelho) dele naquele ponto da pista.
const REC_KEY = (id) => "corrida:recorde:" + id + (PISTAS[id] && PISTAS[id].scale !== 1 ? ":x" + PISTAS[id].scale : ""); // pista ampliada: recorde novo
export function loadBest(id) { const b = store.get(REC_KEY(id)); return b && Array.isArray(b.s) && b.s.length > 20 && b.t > 0 ? b : null; }
const progOf = (idx, tl) => (idx > race.tr.n * 0.75 && tl < 8000 ? idx - race.tr.n : idx); // antes de cruzar a linha conta negativo
export function recordLap() {
  const m = me(); if (!m || !E.S || E.S.phase !== "race" || m.finish != null) return;
  const tl = sNow() - race.lapT0; if (tl < 0 || tl - race.recLast < 100) return;
  race.recLast = tl; const c = race.car, q = (v, k = 10) => Math.round(v * k) / k;
  race.rec.push([Math.round(tl), q(c.x), q(c.y), q(c.z), q(c.a, 100), progOf(race.idx, tl)]);
  if (race.rec.length > 4000) race.rec.length = 0; // volta enorme (parado/perdido): não vale guardar
}
export function lapDone(m) {
  const lt = m.last; if (!lt) return;
  if ((!race.best || lt < race.best.t) && race.rec.length > 20) {
    race.best = { t: lt, car: m.car, mods: m.mods, s: race.rec }; store.set(REC_KEY(E.S.config.pista), race.best);
    dropKart(race.bestKart); race.bestKart = null; race.newRecord = sNow();
  }
  race.lapT0 += lt * 1000; race.rec = []; race.recLast = -1e9; race.bptr = 0;
}
export function drawBest(dt) {
  const b = race.best, m = me();
  const hide = () => { if (race.bestKart) race.bestKart.g.visible = false; };
  if (!b || !m || E.S.phase !== "race" || m.finish != null) return hide();
  const s = b.s, tl = sNow() - race.lapT0;
  if (tl < 0 || tl > s[s.length - 1][0]) return hide();
  while (race.bptr < s.length - 2 && s[race.bptr + 1][0] < tl) race.bptr++;
  while (race.bptr > 0 && s[race.bptr][0] > tl) race.bptr--;
  const A = s[race.bptr], B = s[race.bptr + 1], k = Math.max(0, Math.min(1, (tl - A[0]) / (B[0] - A[0] || 1)));
  let da = B[4] - A[4]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  const x = A[1] + (B[1] - A[1]) * k, y = A[2] + (B[2] - A[2]) * k, z = A[3] + (B[3] - A[3]) * k, a = A[4] + da * k;
  const v = Math.hypot(B[1] - A[1], B[2] - A[2]) / ((B[0] - A[0]) / 1000 || 0.1), idx = ((Math.round(A[5]) % race.tr.n) + race.tr.n) % race.tr.n;
  if (!race.bestKart) race.bestKart = makeKart("#ffd23f", b.car, true, "🏆 Seu recorde", b.mods);
  race.bestKart.g.visible = true;
  poseKart(race.bestKart, x, y, z, a, v, 0, groundH(race.tr, x, y, idx), dt);
}
// diferença para o recorde no mesmo ponto da pista (em segundos; negativo = na frente)
export function deltaBest() {
  const b = race.best, m = me(); if (!b || !m || !m.started || m.finish != null) return null;
  const tl = sNow() - race.lapT0, my = progOf(race.idx, tl), s = b.s;
  if (tl < 1500) return null;
  let i = 0; while (i < s.length - 1 && s[i][5] < my) i++;
  if (i >= s.length - 1) return null;
  return (tl - s[i][0]) / 1000;
}
// quanto cada um já andou (para a posição na corrida): voltas completas + ponto da pista (antes da largada conta negativo)
export function myProg() { const m = me(); if (!m) return 0; return (m.started ? m.laps * race.tr.n + race.idx : race.idx - race.tr.n); }
