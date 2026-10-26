// Corrida da Galera — o pit stop no navegador (regras de F1, f1-regras.js): pedir a parada, entrar no corredor dos
// boxes, parar na garagem, trocar o pneu e voltar para a pista. Dentro do corredor o carro anda sozinho, no mesmo
// jeito da bala (fisica.js entrega o carro para `passoBox` enquanto ele devolve true): o lado sai de `corredor.lat`
// e a velocidade vai para o limitador. O servidor guarda a parada (act `box`, fases "entra" e "sai").
import { E, socket, sNow, me, toast } from "./estado.js";
import { Sound } from "./sons.js";
import { groundH } from "./pista.js";
import { race, nearest } from "./jogo.js";

const F1 = () => window.F1Regras;
const ORDEM = ["macio", "medio", "duro"];

// o estado do box no começo da corrida (null: sem as regras de F1 ou pista sem corredor)
export function iniciarBox(tr, st) {
  if (st.config.regras !== "f1" || !tr.t.boxes) return null;
  return { cor: F1().corredor(tr.t, tr.n, tr.W), pedido: null, fase: null, u: 0, lat0: 0, t: 0, parada: 0, garagem: 0, composto: null, volta: 0, n: 0 };
}
// dá para pedir agora? (não na última volta, que passa pela chegada dentro do corredor, nem depois da bandeirada)
function podePedir() {
  const m = me(), B = race && race.box;
  if (!B || !m || m.finish != null || E.S.phase !== "race") return false;
  if (m.laps + 1 >= E.S.config.voltas) { toast("Última volta: sem box", 1600); return false; }
  return true;
}
// B (ou o toque em "Box"): pede a parada com o próximo composto da fila, depois do atual; de novo, passa para o seguinte;
// depois do último, cancela
export function alternarPedido() {
  const B = race && race.box; if (!B || B.fase) return;
  const atual = race.pneu ? race.pneu.composto : "medio", fila = [1, 2, 3].map((k) => ORDEM[(ORDEM.indexOf(atual) + k) % 3]);
  const k = B.pedido ? fila.indexOf(B.pedido) + 1 : 0;
  if (k >= fila.length) { B.pedido = null; toast("Box cancelado", 1200); return; }
  if (!B.pedido && !podePedir()) return;
  B.pedido = fila[k]; avisar();
}
// 1, 2 e 3: escolhem o composto da parada (e pedem a parada, se ainda não tinha)
export function escolherComposto(composto) {
  const B = race && race.box; if (!B || B.fase || !F1().PNEUS[composto]) return;
  if (!B.pedido && !podePedir()) return;
  B.pedido = composto; avisar();
}
function avisar() { const B = race.box, cor = F1().PNEUS[B.pedido]; toast(`🔧 Box na próxima passagem: ${cor.nome}`, 1600); Sound.pop(); }

// a mureta entre a pista e o corredor (a que kit/corredor-boxes.js desenha, a W/2 + 11): quanto o carro passou dela, só no trecho
// reto (nas rampas de entrada e de saída não tem mureta) e só um pouco (quem já está dentro do corredor não é empurrado)
export function muretaDoBox(tr, idx, lat) {
  const cor = race.box.cor, rel = (idx - cor.i0 + tr.n) % tr.n;
  if (rel <= F1().RAMPA + 1 || rel >= cor.len - F1().RAMPA - 1) return null;
  const over = lat * cor.lado - (tr.W / 2 + 11);
  return over > 0 && over < 10 ? { over, lado: cor.lado } : null;
}
// o ponto (x, y) e o rumo do carro no corredor, no ponto u (em pontos da pista), saindo do lado lat0
function ponto(tr, cor, u, lat0) {
  const n = tr.n, i = cor.i0 + Math.floor(u), f = u - Math.floor(u), a = tr.pts[i % n], b = tr.pts[(i + 1) % n], lat = cor.lat(u, lat0);
  return { x: a.x + (b.x - a.x) * f + (a.nx + (b.nx - a.nx) * f) * lat, y: a.y + (b.y - a.y) * f + (a.ny + (b.ny - a.ny) * f) * lat };
}
// um passo do carro no corredor; true enquanto o carro está nele (a física normal fica de fora)
export function passoBox(dt, spec) {
  const B = race.box, c = race.car, tr = race.tr, m = me(); if (!B || !m) return false;
  const cor = B.cor, vlim = F1().LIMITADOR * spec.vmax;
  if (!B.fase) {
    if (!B.pedido || m.finish != null || c.air || m.laps + 1 >= E.S.config.voltas) return false;
    const rel = (race.idx - cor.i0 + tr.n) % tr.n;
    if (rel > 8) return false;
    const lado = (c.x - tr.pts[race.idx].x) * tr.pts[race.idx].nx + (c.y - tr.pts[race.idx].y) * tr.pts[race.idx].ny;
    const n = (m.paradas || 0) + 1;
    Object.assign(B, { fase: "entra", u: rel + 0.5, lat0: lado, t: 0, composto: B.pedido, volta: m.laps + 1, n, parada: F1().tempoDeParada(E.S.semente, m.id, n), garagem: F1().garagemDe(cor, m.grid) });
    socket.emit("act", { type: "box", fase: "entra" }, () => {});
  }
  const vai = (alvo, a) => { c.v = c.v > alvo ? Math.max(alvo, c.v - spec.brake * dt) : Math.min(alvo, c.v + a * dt); };
  if (B.fase === "entra") {
    const falta = Math.max(0, B.garagem - B.u) * 6;
    vai(Math.min(vlim, Math.sqrt(2 * spec.brake * 0.6 * falta)), spec.acc);
    B.u = Math.min(B.garagem, B.u + (c.v * dt) / 6);
    if (B.u >= B.garagem - 0.02) { B.u = B.garagem; c.v = 0; B.fase = "parada"; B.t = 0; Sound.pop(); }
  } else if (B.fase === "parada") {
    c.v = 0; B.t += dt;
    if (B.t >= B.parada) { race.pneu = F1().pneuNovo(B.composto); B.fase = "sai"; Sound.pop(); }
  } else {
    vai(vlim, spec.acc); B.u += (c.v * dt) / 6;
  }
  const fim = B.u >= cor.len, p = ponto(tr, cor, B.u, B.lat0), q = ponto(tr, cor, Math.min(cor.len, B.u + 0.4), B.lat0);
  c.a = Math.atan2(q.y - p.y, q.x - p.x); c.x = p.x; c.y = p.y;
  c.vx = Math.cos(c.a) * c.v; c.vy = Math.sin(c.a) * c.v; c.slip = 0; c.vz = 0; c.air = false; c.steer *= 0.8; race.offroad = false;
  race.idx = nearest(tr, c.x, c.y, race.idx); c.z = groundH(tr, c.x, c.y, race.idx);
  if (fim) { socket.emit("act", { type: "box", fase: "sai", composto: B.composto }, () => {}); B.fase = null; B.pedido = null; }
  return !fim; // no último passo o carro já está na beira da pista e a física de sempre continua dali
}
