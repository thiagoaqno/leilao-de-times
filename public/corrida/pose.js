// Corrida da Galera — a REDE dos outros carros: uma regra só para desenhar, bater e conferir (navegador e servidor usam este arquivo).
//
//  - `extrapolar` / `entre`: onde um carro está numa hora `T` (ms, relógio do servidor), a partir das amostras que se tem dele
//    { t, x, y, z, a, vx, vy, r }: Hermite (posição e velocidade) entre duas amostras e, depois da última, aceleração constante
//    estimada das duas últimas, com a velocidade se apagando aos poucos se o pacote atrasa (nada de parar de uma vez);
//  - `Outro`: o modelo de UM carro de outro piloto no navegador. Guarda as amostras e uma correção SUAVE (um filtro de 3 polos
//    críticos: posição, velocidade e aceleração do desenho continuam de onde estavam quando chega um pacote novo, sem salto e
//    sem elástico). `pose(T)` é a única conta: o desenho e a previsão de batida chamam a mesma função;
//  - `criarRelogio`: o relógio do servidor visto daqui (NTP: o offset da resposta de menor ida e volta, com variação lenta);
//  - `Snap`: o pacote binário da posição de todos os carros (32 bytes por carro em vez de ~75 de JSON).
(function (root) {
"use strict";
const PASSO_MS = 1000 / 120;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------- extrapolar / interpolar ----------
const K_ACEL = 1, ACEL_MAX = 420;                  // a aceleração ao longo da velocidade, estimada das duas últimas amostras (u/s²), e o limite dela
const H_ACEL_MIN = 0.005, H_ACEL_MAX = 0.25;         // só vale se as duas amostras estão entre 5 e 250 ms uma da outra
const S1 = 0.3, QUEDA = 0.3;                        // sem pacote novo: segue o movimento até S1 s e apaga a velocidade em QUEDA s (depois fica parado)
// tempo "de modelo" para s segundos desde a amostra: igual a s até s1; depois a velocidade cai em linha reta até 0 em s1 + QUEDA. Devolve [tau, w]
// (w = quanto da velocidade ainda vale) — a posição é a integral da velocidade, então não tem tranco na saída do s1.
function horizonte(s, s1) {
  if (s <= s1) return [s, 1];
  if (s >= s1 + QUEDA) return [s1 + QUEDA / 2, 0];
  const u = s - s1;
  return [s1 + u - (u * u) / (2 * QUEDA), 1 - u / QUEDA];
}
// O carro na hora T (ms) a partir da amostra mais nova B e da anterior A (A pode ser null). `o` recebe x, y, z, a, vx, vy, r, ax, ay, ra (aceleração).
// O modelo é um ARCO: a velocidade gira com a guinada (r) e muda de tamanho com a aceleração ao longo dela (estimada das duas últimas
// amostras). Mede-se: com um piloto de teclado, a 200 ms o erro médio é 0,21 m, contra 0,44 m de seguir reto na velocidade de antes.
function extrapolar(B, A, T, o, s1 = S1) {
  const s = (T - B.t) / 1000, vx = B.vx ?? 0, vy = B.vy ?? 0, r = B.r || 0, v0 = Math.hypot(vx, vy), th0 = v0 > 1e-3 ? Math.atan2(vy, vx) : B.a;
  let al = 0, vz = 0;
  if (A) {
    const h = (B.t - A.t) / 1000;
    if (h >= H_ACEL_MIN && h <= H_ACEL_MAX) { al = clamp(((v0 - Math.hypot(A.vx ?? 0, A.vy ?? 0)) / h) * K_ACEL, -ACEL_MAX, ACEL_MAX); vz = clamp(((B.z || 0) - (A.z || 0)) / h, -150, 150); }
  }
  let tau = 0, w = 1;
  if (s > 0) {
    [tau, w] = horizonte(s, s1);
    if (al < 0 && v0 > 0) { const tp = -v0 / al; if (tau > tp) { tau = tp; w = 0; } } // freando: para quando a velocidade zera, e o carro não volta de ré
  }
  let x = B.x, y = B.y, v = v0, th = th0;
  if (tau > 0) {
    const n = Math.min(12, Math.ceil(tau / 0.04)), dt = tau / n;
    for (let i = 0; i < n; i++) { // cada pedaço é um arco: a corda aponta para a direção do meio
      const v2 = Math.max(0, v + al * dt), dth = r * dt, corda = ((v + v2) / 2) * dt * (Math.abs(dth) < 1e-3 ? 1 : Math.sin(dth / 2) / (dth / 2));
      x += corda * Math.cos(th + dth / 2); y += corda * Math.sin(th + dth / 2); v = v2; th += dth;
    }
  }
  const c = Math.cos(th), sn = Math.sin(th);
  o.x = x; o.y = y; o.z = (B.z || 0) + vz * tau; o.a = B.a + clamp(r * tau, -1.2, 1.2);
  o.vx = v * c * w; o.vy = v * sn * w; o.r = r * w; o.ax = (al * c - v * r * sn) * w * w; o.ay = (al * sn + v * r * c) * w * w; o.ra = 0;
  return o;
}
// Entre duas amostras (A.t <= T <= B.t): Hermite cúbico com as velocidades (posição) e as guinadas (ângulo)
function entre(A, B, T, o) {
  const dt = B.t - A.t, h = dt / 1000, u = clamp((T - A.t) / dt, 0, 1), u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  const d00 = 6 * u2 - 6 * u, d10 = 3 * u2 - 4 * u + 1, d01 = -d00, d11 = 3 * u2 - 2 * u;
  o.x = h00 * A.x + h10 * h * A.vx + h01 * B.x + h11 * h * B.vx; o.y = h00 * A.y + h10 * h * A.vy + h01 * B.y + h11 * h * B.vy;
  o.vx = (d00 * A.x + d10 * h * A.vx + d01 * B.x + d11 * h * B.vx) / h; o.vy = (d00 * A.y + d10 * h * A.vy + d01 * B.y + d11 * h * B.vy) / h;
  const a1 = A.a + wrap(B.a - A.a), ar = A.r || 0, br = B.r || 0;
  o.a = h00 * A.a + h10 * h * ar + h01 * a1 + h11 * h * br; o.r = (d00 * A.a + d10 * h * ar + d01 * a1 + d11 * h * br) / h;
  o.z = (A.z || 0) + ((B.z || 0) - (A.z || 0)) * u;
  o.ax = (B.vx - A.vx) / h; o.ay = (B.vy - A.vy) / h; o.ra = (br - ar) / h;
  return o;
}

// ---------- o modelo de um carro de outro piloto ----------
// Quando chega um pacote, o caminho previsto muda um pouco (a previsão errou). O desenho NÃO salta: cada pacote deixa uma correção
// própria — a diferença entre o caminho velho e o novo na hora do pacote (posição, velocidade e aceleração) — que se apaga com 3 polos
// críticos em -w (1/s); como a soma das correções continua o desenho de onde ele estava, a posição, a velocidade e a aceleração são
// contínuas. O w de cada correção vem do TAMANHO dela: ela move o desenho no máximo V_CORR u/s no pior instante (0,27 w d; uns 1,8 m/s,
// 3 cm por quadro, abaixo do que o olho percebe). Correção pequena (centímetros: a quase totalidade) some em dois quadros e não atrasa o
// carro; a grande (decímetros: o outro piloto freou ou virou) se espalha por até ~0,3 s. Cada uma tem o seu w: uma grande não segura as pequenas.
const ATRASO_FOLGA = 0.2; // pacote com mais de 0,2 s de atraso além do normal: a extrapolação começa a se apagar
const CFG = { vc: 11, wmin: 14, wmax: 120 };
const BRACO = 22;           // u: do centro ao bico do carro (a guinada move o bico)
const SALTO_U = 110;       // diferença maior que isto (uns 23 m: box, "↺ Pista", teletransporte do servidor) salta de uma vez
const GUARDA = 24;         // amostras guardadas
const MAX_CORR = 24;       // correções vivas por carro
const TMP = {}, TMP2 = {};
function Outro() { this.buf = []; this.cor = []; this.s1 = S1; this.hz = 0; }
Outro.prototype.ultimo = function () { return this.buf.length ? this.buf[this.buf.length - 1] : null; };
// a pose "da rede" (sem as correções) na hora T
Outro.prototype.base = function (T, o) {
  const b = this.buf, n = b.length; if (!n) return null;
  const B = b[n - 1];
  if (n === 1 || T >= B.t) return extrapolar(B, n > 1 ? b[n - 2] : null, T, o, this.s1);
  let i = n - 1; while (i > 0 && b[i - 1].t > T) i--;
  if (i === 0) return extrapolar(b[0], null, b[0].t, o); // antes da primeira amostra: fica nela
  return entre(b[i - 1], b[i], T, o);
};
// a pose desenhada na hora T: o caminho da rede mais a soma das correções, cada uma (c0 + c1 s + c2 s²) e^{-w s}
Outro.prototype.pose = function (T, o) {
  if (!this.base(T, o)) return null;
  const cor = this.cor;
  for (let j = 0; j < cor.length; j++) {
    const C = cor[j], s = Math.max(0, (T - C.t0) / 1000), W = C.w, e = Math.exp(-W * s), d = C.d;
    for (let k = 0; k < 3; k++) {
      const c0 = d[k], c1 = d[3 + k] + W * c0, c2 = (d[6 + k] + 2 * W * d[3 + k] + W * W * c0) / 2;
      const q = c0 + c1 * s + c2 * s * s, dq = c1 + 2 * c2 * s - W * q, ddq = 2 * c2 - 2 * W * (c1 + 2 * c2 * s) + W * W * q;
      if (k === 0) { o.x += q * e; o.vx += dq * e; o.ax += ddq * e; }
      else if (k === 1) { o.y += q * e; o.vy += dq * e; o.ay += ddq * e; }
      else { o.a += q * e; o.r += dq * e; o.ra += ddq * e; }
    }
  }
  return o;
};
// chegou uma amostra { t, x, y, z, a, vx, vy, r } (hora do servidor, ms). `Tc`: a hora do servidor em que o desenho está AGORA (ms)
Outro.prototype.receber = function (am, Tc) {
  const b = this.buf, n = b.length;
  if (n && am.t <= b[n - 1].t) return false; // velha ou repetida
  // o atraso normal desta rede (da hora da amostra até o desenho): o corte da extrapolação fica ATRASO_FOLGA depois dele
  const hz = Math.max(0, (Tc - am.t) / 1000); this.hz = n ? this.hz + (hz - this.hz) * 0.1 : hz; this.s1 = clamp(this.hz + ATRASO_FOLGA, S1, 1.2);
  if (n) this.base(Tc, TMP);
  b.push(am); if (b.length > GUARDA) b.shift();
  const cor = this.cor;
  if (!n) { cor.length = 0; return true; }
  const nv = this.base(Tc, TMP2);
  if (Math.hypot(TMP.x - nv.x, TMP.y - nv.y) > SALTO_U) { cor.length = 0; return true; } // saltou de verdade
  const d = [TMP.x - nv.x, TMP.y - nv.y, wrap(TMP.a - nv.a), TMP.vx - nv.vx, TMP.vy - nv.vy, TMP.r - nv.r, TMP.ax - nv.ax, TMP.ay - nv.ay, TMP.ra - nv.ra];
  const tam = Math.max(Math.hypot(d[0], d[1]), BRACO * Math.abs(d[2]), 1e-3); // (o tamanho da correção: o maior desvio de um ponto do carro, o centro ou o bico)
  const w = clamp(CFG.vc / (0.27 * tam), CFG.wmin, CFG.wmax);
  for (let j = cor.length - 1; j >= 0; j--) if ((Tc - cor[j].t0) * w0(cor[j]) > 10000) cor.splice(j, 1); // (já se apagou)
  if (cor.length >= MAX_CORR) cor.shift();
  cor.push({ t0: Tc, w, d });
  return true;
};
const w0 = (C) => C.w; // (s * w > 10: e^-10 ~ 0,00005)

// ---------- o relógio do servidor (NTP) ----------
// agoraLocal(): ms (do relógio local, com fração). amostrar(t0, ts, t3): perguntei em t0, o servidor respondeu ts, a resposta chegou em t3.
// O offset vem das respostas de MENOR ida e volta (as com fila no caminho mentem); a variação é lenta (no máximo 2 ms por amostra).
function criarRelogio(agoraLocal) {
  const r = { off: 0, ok: false, rtt: NaN, minRtt: Infinity, amostras: [], n: 0,
    agora: () => agoraLocal() + r.off,
    palpite(off) { if (!r.ok) r.off = off; }, // (o `now` do estado, grosso: serve até a primeira resposta)
    amostrar(t0, ts, t3) {
      const rtt = t3 - t0; if (!(rtt >= 0) || rtt > 3000 || !Number.isFinite(ts)) return false;
      const a = r.amostras; a.push({ rtt, off: ts - (t0 + rtt / 2) }); if (a.length > 16) a.shift(); r.n++;
      let mn = Infinity; for (const x of a) mn = Math.min(mn, x.rtt); r.minRtt = mn;
      const bons = a.filter((x) => x.rtt <= mn + 8 + mn * 0.15).map((x) => x.off).sort((p, q) => p - q), est = bons[bons.length >> 1];
      r.rtt = r.rtt !== r.rtt ? rtt : r.rtt + (Math.min(rtt, mn + 30) - r.rtt) * 0.2;
      const dlt = est - r.off;
      if (!r.ok || Math.abs(dlt) > 25) { r.off = est; r.ok = true; } else r.off += clamp(dlt, -2, 2);
      return true;
    } };
  return r;
}

// ---------- o pacote de posições ----------
// cabeçalho: t (Float64, ms do servidor), n (u8). Por carro: tamanho do id (u8), o id, x e y (Int32 /100), z (Int16 /10), a (Int16 /10000),
// v (Int16 /10), prog (Float32), idade (Uint16, décimos de ms: 1 ms de erro na hora da pose são 4 cm a 150 km/h), vx e vy (Int16 /10), r (Int16 /1000). `lista`: [id, x, y, z, a, v, prog, idade, vx, vy, r].
const i16 = (v, k) => clamp(Math.round(v * k), -32768, 32767);
function codificar(t, lista) {
  let tam = 9; for (const q of lista) tam += 27 + String(q[0]).length;
  const buf = new Uint8Array(tam), dv = new DataView(buf.buffer); let p = 0;
  dv.setFloat64(p, t, true); p += 8; dv.setUint8(p++, lista.length);
  for (const q of lista) {
    const id = String(q[0]); dv.setUint8(p++, id.length); for (let i = 0; i < id.length; i++) dv.setUint8(p++, id.charCodeAt(i) & 127);
    dv.setInt32(p, Math.round(q[1] * 100), true); p += 4; dv.setInt32(p, Math.round(q[2] * 100), true); p += 4;
    dv.setInt16(p, i16(q[3], 10), true); p += 2; dv.setInt16(p, i16(wrap(q[4]), 10000), true); p += 2; dv.setInt16(p, i16(q[5], 10), true); p += 2;
    dv.setFloat32(p, q[6], true); p += 4; dv.setUint16(p, clamp(Math.round(q[7] * 10), 0, 65535), true); p += 2;
    dv.setInt16(p, i16(q[8], 10), true); p += 2; dv.setInt16(p, i16(q[9], 10), true); p += 2; dv.setInt16(p, i16(q[10], 1000), true); p += 2;
  }
  return buf;
}
function decodificar(buf) {
  const dv = ArrayBuffer.isView(buf) ? new DataView(buf.buffer, buf.byteOffset, buf.byteLength) : new DataView(buf);
  let p = 0; const t = dv.getFloat64(p, true); p += 8; const n = dv.getUint8(p++), c = [];
  for (let k = 0; k < n; k++) {
    const len = dv.getUint8(p++); let id = ""; for (let i = 0; i < len; i++) id += String.fromCharCode(dv.getUint8(p++));
    const x = dv.getInt32(p, true) / 100; p += 4; const y = dv.getInt32(p, true) / 100; p += 4;
    const z = dv.getInt16(p, true) / 10; p += 2; const a = dv.getInt16(p, true) / 10000; p += 2; const v = dv.getInt16(p, true) / 10; p += 2;
    const prog = dv.getFloat32(p, true); p += 4; const idade = dv.getUint16(p, true) / 10; p += 2;
    const vx = dv.getInt16(p, true) / 10; p += 2; const vy = dv.getInt16(p, true) / 10; p += 2; const r = dv.getInt16(p, true) / 1000; p += 2;
    c.push([id, x, y, z, a, v, prog, idade, vx, vy, r]);
  }
  return { t, c };
}
const Snap = { codificar, decodificar };

const api = { PASSO_MS, CFG, wrap, extrapolar, entre, Outro, SALTO_U, S1, QUEDA, K_ACEL, horizonte, criarRelogio, Snap };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.Pose = api;
})(typeof window !== "undefined" ? window : globalThis);
