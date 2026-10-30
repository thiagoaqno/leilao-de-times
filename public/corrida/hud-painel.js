// Corrida da Galera — o resto do HUD de F1 no estilo do jogo da EA: o mostrador central (bateria, marcha, velocidade, rotação, modo do
// ERS), o quadro de tempos do alto à direita (setores S1/S2/S3, posição, volta atual e BEST), o minimapa do traçado inteiro e o banner
// de avisos de punição. Tudo em DOM criado uma vez e atualizado só no que mudou (hud.js chama a ~10x por segundo; o minimapa a cada
// poucos quadros). As contas puras estão em hud-mfd.js (HudMfd).
import { E, $, carOf, checkpoint } from "./estado.js";
import { race } from "./jogo.js";

const M = () => window.HudMfd, F = () => window.F1Regras;
// escreve só o que mudou (o cache fica no próprio elemento): "t" texto, "c" classe (atributo: vale também para SVG), "w" largura, "bg" fundo, "col" cor, "d" display, outro = atributo
export const set = (el, prop, v) => {
  const c = el._v || (el._v = {}); if (c[prop] === v) return; c[prop] = v;
  if (prop === "t") el.textContent = v; else if (prop === "c") el.setAttribute("class", v); else if (prop === "w") el.style.width = v; else if (prop === "bg") el.style.background = v; else if (prop === "col") el.style.color = v; else if (prop === "d") el.style.display = v; else el.setAttribute(prop, v);
};
const lim = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- o mostrador central ----------
const ARCO = 150.8; // 270° do arco de r = 32 (2π·32·0,75)
const N_LED = 12;
export function montarCentro() {
  const el = $("hCentro"); if (!el || el.dataset.ok) return; el.dataset.ok = 1;
  const arco = (id, cls) => `<svg class="gc-arco ${cls}" viewBox="0 0 80 80" aria-hidden="true"><circle class="trilho" cx="40" cy="40" r="32" transform="rotate(135 40 40)" stroke-dasharray="${ARCO} 400"/><circle class="valor" id="${id}" cx="40" cy="40" r="32" transform="rotate(135 40 40)" stroke-dasharray="0 400"/></svg>`;
  el.innerHTML = `<div class="gc-leds" id="gLeds">${"<i></i>".repeat(N_LED)}</div>
    <div class="gc-aro"><div class="gc-lado gc-bat">${arco("gBatArco", "")}<div class="gc-txt"><small>BATT</small><b id="gBat">0%</b></div></div>
    <div class="gc-meio"><b id="pMarcha">N</b><span id="gModo">BALANCED</span></div>
    <div class="gc-lado gc-vel">${arco("gRpmArco", "rpm")}<div class="gc-txt"><small>KM/H</small><b id="pVel">0</b><em id="gRpm">0</em></div></div></div>
    <div class="gc-ers"><i id="gErsBarra"></i></div>
    <div class="gc-baixo"><span class="gc-botao" id="gBotao">⚡</span><b id="pOver">OVERTAKE</b><span class="gc-drs" id="gDrs">DRS</span></div>`;
}
// ctx: { m, kmh, modoErs }
export function atualizarCentro(ctx) {
  const m = ctx.m, rpm = Math.min(1, race.rpm || 0), carga = race.ers ? race.ers.carga : 0, ativo = !!race.ersAtivo;
  set($("pVel"), "t", ctx.kmh); set($("pMarcha"), "t", !m ? "" : (ctx.kmh < 1 && !race.marcha ? "N" : race.marcha || 1));
  set($("gRpm"), "t", M().rpmReal(rpm, ctx.kmh));
  const acesas = Math.round(rpm * N_LED), leds = $("gLeds").children;
  for (let k = 0; k < N_LED; k++) set(leds[k], "c", k < acesas ? (k < N_LED * 0.45 ? "g" : k < N_LED * 0.8 ? "r" : "b") : "");
  set($("gRpmArco"), "stroke-dasharray", `${(rpm * ARCO).toFixed(1)} 400`);
  set($("gBatArco"), "stroke-dasharray", `${(lim(carga, 0, 1) * ARCO).toFixed(1)} 400`);
  set($("gBatArco"), "class", "valor " + (ativo ? "on" : carga < 0.2 ? "baixo" : carga < 0.5 ? "medio" : "bom"));
  set($("gBat"), "t", Math.round(carga * 100) + "%");
  set($("gModo"), "t", ctx.modoErs.texto); set($("gModo"), "class", ctx.modoErs.id);
  // a barrinha verde embaixo da marcha: a carga que o ERS ainda pode desdobrar nesta volta
  set($("gErsBarra"), "w", Math.round(lim(carga, 0, 1) * 100) + "%");
  // OVERTAKE: aceso enquanto o ERS está desdobrando; o círculo mostra a tecla (E no manual) e o DRS tem a sua pílula
  const manual = E.S.config.ers === "manual";
  set($("gBotao"), "t", manual ? "E" : "⚡"); set($("pOver"), "c", ativo ? "on" : carga > 0.12 ? "pronto" : "");
  const aberto = !!race.drsAtivo, pronto = !!m && m.drsZona >= 0;
  set($("gDrs"), "c", "gc-drs" + (aberto ? " aberto" : pronto ? " pronto" : ""));
}

// ---------- o quadro de tempos (alto à direita) ----------
export function montarTempo() {
  const el = $("hTempo"); if (!el || el.dataset.ok) return; el.dataset.ok = 1;
  el.innerHTML = `<div class="ht-set"><span>S1</span><span>S2</span><span>S3</span><i class="off"></i><i class="off"></i><i class="off"></i></div>
    <div class="ht-linha"><b id="htPos">1<small>/1</small></b><span id="htVolta">0:00.000</span></div><div class="ht-linha ht-best"><span>BEST</span><span id="htBest">—:--.---</span></div>`;
}
// Segue os setores (12 checkpoints, 4 por setor) e o desgaste por volta do pneu. Guardado em `race.hudT` (zera sozinho a cada corrida).
function seguir(m, pneu) {
  const T = race.hudT || (race.hudT = { sector: race.sector, lapIni: race.startAt, t: [null, null, null], cor: ["off", "off", "off"], melhor: [null, null, null], desgIni: pneu ? pneu.desgaste : 0, comp: pneu && pneu.composto, taxa: null });
  if (pneu) { // pneu novo (box): recomeça a medida
    if (pneu.composto !== T.comp || pneu.desgaste < T.desgIni - 0.02) { T.comp = pneu.composto; T.desgIni = pneu.desgaste; T.taxa = null; }
  }
  if (race.sector === T.sector) return T;
  const s = race.sector, antes = T.sector; T.sector = s; if (!m || !m.started) return T;
  const t = race.cpT, voltasFeitas = (race.voltaLocal || 0) - (s === 0 ? 1 : 0), valido = voltasFeitas >= 1; // a volta de largada não serve de comparação
  const fim = (k, soFar) => { const tempo = (t - T.lapIni) / 1000 - soFar; T.t[k] = tempo; T.cor[k] = M().corDoSetor(tempo, T.melhor[k], valido); if (valido && (!(T.melhor[k] > 0) || tempo < T.melhor[k])) T.melhor[k] = tempo; };
  if (s === 4 && antes === 3) { T.cor[1] = T.cor[2] = "off"; T.t[1] = T.t[2] = null; fim(0, 0); }
  else if (s === 8 && antes === 7) fim(1, T.t[0] || 0);
  else if (s === 0 && antes === 11) {
    if ((race.voltaLocal || 0) < 1) { T.lapIni = t; return T; } // a linha de largada (começa a volta 1), não uma volta que acabou
    fim(2, (T.t[0] || 0) + (T.t[1] || 0)); T.lapIni = t;
    const vr = M().donoDaVoltaRapida(E.S.players); if (vr && vr.id === m.id && valido) T.cor = ["roxo", "roxo", "roxo"]; // a volta mais rápida da corrida é minha
    if (pneu) { const d = pneu.desgaste - T.desgIni; if (d > 0.002 && pneu.composto === T.comp) T.taxa = d; T.desgIni = pneu.desgaste; }
  }
  return T;
}
export function atualizarTempo(m, st, now) {
  const T = seguir(m, race.pneu); montarTempo();
  const pos = m ? st.findIndex((r) => r.id === m.id) + 1 : 0, ini = T.lapIni;
  const p = $("htPos"); const html = m ? `${pos}<small>/${st.length}</small>` : "—"; if (p._h !== html) { p._h = html; p.innerHTML = html; }
  const dentro = m && m.started && m.finish == null, atual = dentro ? Math.max(0, (now - ini) / 1000) : m && m.finish != null ? m.last : 0;
  set($("htVolta"), "t", M().tempoVolta(atual)); set($("htBest"), "t", M().tempoVolta(m && m.best));
  const barras = $("hTempo").querySelectorAll(".ht-set i"), cur = m && m.started ? M().setorAtual(race.sector) : -1;
  for (let k = 0; k < 3; k++) set(barras[k], "c", T.cor[k] !== "off" ? T.cor[k] : k === cur ? "atual" : "off");
  return T;
}

// ---------- a estratégia de box (as contas do MFD) ----------
// Devolve { tp: voltas de pneu, janela, perda, retorno }. `cors` na ordem da corrida (prog e v), `esc` as unidades por índice.
export function estrategia(m, cors, esc) {
  const pneu = race.pneu, B = race.box; if (!m || !pneu || !B) return {};
  const f = F(), T = race.hudT || {}, car = carOf(m);
  const tp = M().voltasDePneu(pneu, f, { taxaMedida: T.taxa, fator: car && car.desgaste });
  const jogos = m.jogos || {}, usados = ["macio", "medio", "duro"].filter((c) => jogos[c] != null && jogos[c] < f.JOGOS_POR_COMPOSTO).length;
  const chuva = !!(E.S.clima && E.S.clima.chove) || pneu.composto === "chuva" || jogos.chuva < f.JOGOS_POR_COMPOSTO;
  const voltaAtual = Math.min(E.S.config.voltas, (m.laps || 0) + 1);
  const janela = M().janelaDeBox({ voltaAtual, voltas: E.S.config.voltas, voltasDePneu: tp.voltas, compostosUsados: usados, chuva });
  let perda = null, retorno = null;
  const cor = race.tr && race.tr.corredor;
  if (cor && car) {
    perda = M().perdaNoBox({ comprimento: cor.comprimento, vmax: car.vmax, limitador: f.LIMITADOR, parada: f.PARADAS[1].tempo });
    const eu = cors.find((c) => c.id === m.id);
    if (eu && perda != null) {
      const atras = cors.filter((c) => c !== eu && !c.dnf && c.prog < eu.prog).map((c) => ({ seg: c.v >= 22 ? Math.max(0, eu.prog - c.prog) * esc / c.v : null }));
      retorno = M().posicaoNoRetorno(cors.filter((c) => !c.dnf).findIndex((c) => c === eu) + 1, atras, perda);
    }
  }
  return { tp, janela, perda, retorno };
}

// ---------- o banner de punição (a API para outros módulos) ----------
// Um aviso central temporário (`avisarPunicao`) e a linha fixa "Stop-and-go: cumpra em N voltas" (`fixarPunicao`). Qualquer lugar pode
// chamar `window.HudF1.avisar("Stop-and-go de 10 s", { tipo: "stopgo", ms: 4000 })`, `window.HudF1.fixar({ tipo: "stopgo", voltas: 2 })`
// (ou `fixar(null)` para apagar), ou mandar os eventos `hud:punicao` e `hud:punicao-fixa` na window. Se o jogador tiver `stopGo`,
// `stopAndGo` ou `punicao` no estado (servidor), a linha fixa aparece sozinha (HudMfd.punicaoDoCarro).
const FILA = []; let fixa = null, ate = 0, atual = null;
export function avisarPunicao(texto, { tipo = "punicao", ms = 4200 } = {}) { if (!texto) return; FILA.push({ texto: String(texto), tipo, ms }); }
export function fixarPunicao(p) { fixa = p ? { tipo: p.tipo || "stopgo", voltas: p.voltas == null ? null : p.voltas, segundos: p.segundos ?? null } : null; }
window.HudF1 = Object.assign(window.HudF1 || {}, { avisar: avisarPunicao, fixar: fixarPunicao });
window.addEventListener("hud:punicao", (ev) => { const d = ev.detail || {}; avisarPunicao(d.texto, d); });
window.addEventListener("hud:punicao-fixa", (ev) => fixarPunicao(ev.detail));
export function desenharBanner(m, agora) {
  const b = $("hBanner"), f = $("hPunicao"); if (!b || !f) return;
  if (!atual && FILA.length) { atual = FILA.shift(); ate = agora + atual.ms; }
  if (atual && agora > ate) atual = null;
  if (atual) { set(b, "t", atual.texto); set(b, "c", "hud hbanner on " + atual.tipo); } else { set(b, "c", "hud hbanner"); }
  const volta = m ? Math.min(E.S.config.voltas, (m.laps || 0) + 1) : null, pu = fixa || M().punicaoDoCarro(m, volta);
  if (pu) { set(f, "t", M().textoDaPunicao(pu)); set(f, "c", "hud hpun on " + pu.tipo + (pu.voltas != null && pu.voltas <= 1 ? " urgente" : "")); } else set(f, "c", "hud hpun");
}

// ---------- o minimapa do traçado inteiro (como no jogo da EA) ----------
// O traçado fica numa camada guardada (feita uma vez por corrida); a cada chamada só os carros (pontos nas cores das equipes) e os
// números dos setores (1, 2 e 3, onde cada setor começa) são desenhados por cima.
function baseDoMapa(tr, S) {
  const cv = document.createElement("canvas"); cv.width = cv.height = S; const c = cv.getContext("2d");
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < tr.n; i += 2) { const p = tr.pts[i]; if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
  const pad = 26, esc = (S - 2 * pad) / Math.max(x1 - x0, y1 - y0, 1), ox = (S - (x1 - x0) * esc) / 2 - x0 * esc, oy = (S - (y1 - y0) * esc) / 2 - y0 * esc;
  const tela = (p) => [p.x * esc + ox, p.y * esc + oy];
  c.lineCap = c.lineJoin = "round";
  c.beginPath(); for (let i = 0; i <= tr.n; i += 3) { const [x, y] = tela(tr.pts[i % tr.n]); i ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.closePath(); c.strokeStyle = "#000c"; c.lineWidth = 9; c.stroke(); c.strokeStyle = "#f2f4f8"; c.lineWidth = 4.2; c.stroke();
  // os números dos setores, para o lado de fora do traçado; e a linha de chegada (um quadradinho xadrez)
  const cx = (x0 + x1) / 2 * esc + ox, cy = (y0 + y1) / 2 * esc + oy;
  c.font = "800 15px 'Titillium Web',Figtree,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
  [0, 4, 8].forEach((cp, k) => { const [x, y] = tela(tr.pts[checkpoint(cp, tr.n) % tr.n]), d = Math.hypot(x - cx, y - cy) || 1, tx = x + (x - cx) / d * 15, ty = y + (y - cy) / d * 15;
    c.fillStyle = "#fff"; c.strokeStyle = "#000d"; c.lineWidth = 4; c.strokeText(String(k + 1), tx, ty); c.fillText(String(k + 1), tx, ty); });
  const [lx, ly] = tela(tr.pts[0]); c.fillStyle = "#fff"; c.fillRect(lx - 4, ly - 4, 8, 8); c.fillStyle = "#0a0c12"; c.fillRect(lx - 4, ly - 4, 4, 4); c.fillRect(lx, ly, 4, 4);
  return { cv, esc, ox, oy };
}
export function minimapaF1(st, m) {
  const cv = $("mini"), c = cv.getContext("2d"), S = cv.width, tr = race.tr;
  if (!race.miniF1) race.miniF1 = baseDoMapa(tr, S);
  const B = race.miniF1, cors = race.hudCors || [];
  c.clearRect(0, 0, S, S); c.drawImage(B.cv, 0, 0);
  const cor = new Map(cors.map((k) => [k.id, k.cor]));
  const pt = (x, y) => [x * B.esc + B.ox, y * B.esc + B.oy];
  for (const r of st) {
    if (m && r.id === m.id) continue; const gh = race.ghosts.get(r.id); if (!gh) continue;
    const [x, y] = pt(gh.x, gh.y); c.beginPath(); c.arc(x, y, 5.5, 0, 7); c.fillStyle = cor.get(r.id) || r.p.color; c.fill(); c.lineWidth = 1.6; c.strokeStyle = "#000c"; c.stroke();
  }
  const eu = m ? race.car : null;
  if (eu) { // eu: uma seta na cor da minha equipe, apontando para onde o carro vai
    const [x, y] = pt(eu.x, eu.y); c.save(); c.translate(x, y); c.rotate(eu.a + Math.PI / 2);
    c.beginPath(); c.moveTo(0, -9); c.lineTo(6.5, 7); c.lineTo(0, 3.5); c.lineTo(-6.5, 7); c.closePath(); c.fillStyle = cor.get(m.id) || m.color || "#e10600"; c.fill(); c.lineWidth = 2; c.strokeStyle = "#fff"; c.stroke(); c.restore();
  }
}
