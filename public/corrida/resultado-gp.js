// Corrida da Galera — a tela de RESULTADO do GP (regras de F1): o pódio com a cor e o logo de cada equipe, os carros dos 3 primeiros cada um
// em cima do seu degrau (podio-3d.js: uma cena só, e não o palco da sala, que o menus.js pára a cada estado do servidor), a festa de quem ganha, e a tabela no estilo da transmissão: uma faixa com o
// degradê da equipe por piloto, a sigla de 3 letras (o humano também tem), o ícone amarelo de quem levou acréscimo de tempo e chips de
// dano, stop-and-go e bandeira preta. hud.js só chama `htmlResultado` + `aposResultado` (e `resultadoMudou`, para não refazer a tela,
// e o carro, a cada estado do servidor). O desenho é CSS (resultado-gp.css): a animação de entrada some com "reduzir movimento".
import { E, PISTAS, h, fmt } from "./estado.js";
import { MODS3, MODS_PADRAO } from "./carros.js";
import { podio3d } from "./podio-3d.js";

const reduz = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const EQUIPES = () => (window.F1Pilotos && window.F1Pilotos.EQUIPES) || {};
const LOGOS = () => window.EQUIPES_F1 || {};
const corOk = (c) => (/^#[0-9a-f]{6}$/i.test(c || "") ? c : "#9aa1ad");
const siglaDe = (p) => (window.HudTorre ? window.HudTorre.siglaDe(p) : String((p && p.sigla) || "???"));
const nomeDe = (p) => (p && (p.nomeCompleto || p.name)) || "?";

// os ícones (SVG de linha, na cor do texto, a menos que tenham a própria)
const ICONE = {
  alerta: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4 1.6 20.6h20.8z" fill="#ffd23f" stroke="#8a6500" stroke-width="1.3" stroke-linejoin="round"/><path d="M12 9v5.4" stroke="#241a00" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.5" r="1.4" fill="#241a00"/></svg>`,
  dano: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 6.3a5.2 5.2 0 0 1-6.9 5L6 19.8a2 2 0 0 1-2.8-2.8l8.6-8.6a5.2 5.2 0 0 1 5-6.9l-3 3 .6 3.4 3.4.6z" fill="currentColor"/></svg>`,
  parada: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z" fill="currentColor"/><path d="M7.5 12h9" stroke="#0b1016" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  preta: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 22V3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 4h14l-3 4.5 3 4.5H5z" fill="currentColor"/></svg>`,
  copa: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3.5v1.5A3.5 3.5 0 0 0 7 10M17 5h3.5v1.5A3.5 3.5 0 0 1 17 10" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 14v4M8 21h8M9.5 18h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  rapida: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 21 12l-9 9.5L3 12z" fill="currentColor"/></svg>`,
};

// o logo da equipe (o mesmo da sala; menus.js troca pela sigla se a imagem não carregar)
function infoEquipe(p) {
  const id = p && p.equipe, e = id && EQUIPES()[id];
  return e ? { id, nome: e.nome, cor: corOk(e.cor), sigla: e.sigla, pintura: e.pintura, logo: !!(LOGOS()[id] && LOGOS()[id].arquivo) } : { id: null, nome: "", cor: corOk(p && p.color), sigla: "", pintura: null, logo: false };
}
const marca = (eq) => eq.id
  ? `<span class="equipe-marca rg-marca" style="--equipe:${eq.cor}">${eq.logo ? `<img data-logo-f1 src="/api/corrida/logo/${eq.id}" alt="" data-sigla="${h(eq.sigla)}">` : `<span class="sigla">${h(eq.sigla)}</span>`}</span>`
  : `<span class="rg-marca rg-sem" aria-hidden="true"></span>`;
const estiloEq = (cor) => `--eq:${cor};--eq6:${cor}a6;--eq3:${cor}4d;--eq1:${cor}1f`;

// por que a punição: as linhas da direção de prova que falam do piloto (o servidor manda as 20 últimas; pode não haver nenhuma)
function motivosDoLog(S, p) {
  if (!p || !Array.isArray(S.log)) return [];
  const out = [];
  for (const l of S.log) {
    const t = String((l && l.text) || "");
    if (!(t.startsWith("⏱️ " + p.name) || t.startsWith("🛑 " + p.name) || t.startsWith("🏴 " + p.name) || (t.startsWith("🔧 " + p.name) && t.includes("limitador")))) continue;
    const limpo = t.replace(/^\S+\s+/, "").replace(/^[^:]+ parou nos boxes[^.]*\.[^.]*\.\s*/, "").trim();
    if (limpo && !out.includes(limpo)) out.push(limpo);
  }
  return out.slice(-3);
}
// o que o piloto levou: segundos de acréscimo (o ícone amarelo), stop-and-go cumprido, bandeira preta, dano
function punicaoDe(S, p, r) {
  const secs = Math.round(Math.max((p && p.acrescimo) || 0, r.penal || 0) * 10) / 10;
  const motivos = motivosDoLog(S, p), partes = [];
  if (secs > 0) partes.push(`Acréscimo de ${secs} s no tempo final`);
  if (r.penal > 0) partes.push(`${r.penal} s de um stop-and-go não cumprido`);
  if (r.sg) partes.push("Stop-and-go cumprido");
  const titulo = partes.concat(motivos).join(" · ");
  return { secs, motivos, titulo };
}

const pneusHTML = (r, F) => (r.paradas ? `${r.paradas}P ` : "0P ") + (r.compostos || []).map((c) => `<u class="pn" style="--c:${F.PNEUS[c] ? F.PNEUS[c].cor : "#999"}"></u>`).join("");

function linhaHTML(r, i, ctx) {
  const { S, m, F, vencedor } = ctx, p = S.players.find((x) => x.id === r.id), eq = infoEquipe(p), eu = !!(m && r.id === m.id);
  const fora = r.nc || r.dnf, g = r.grid + 1, d = g - r.pos, pun = punicaoDe(S, p, r), danoPct = Math.round(r.dano || 0);
  const final = r.dsq ? "DSQ" : r.dnf ? "DNF" : r.nc ? "NC" : r.tempo == null ? `+${Math.max(1, S.config.voltas - r.voltas)} volta${S.config.voltas - r.voltas > 1 ? "s" : ""}` : r === vencedor ? fmt(r.tempo) : `+${(r.tempo - vencedor.tempo).toFixed(3)} s`;
  const alerta = pun.secs > 0 ? `<span class="rg-alerta" tabindex="0" role="img" aria-label="${h(pun.titulo)}" title="${h(pun.titulo)}" data-dica="${h(pun.titulo)}">${ICONE.alerta}</span>` : "";
  const chips = [
    pun.secs > 0 ? `<span class="rg-chip pen" title="${h(pun.titulo)}">+${pun.secs} s</span>` : "",
    r.sg ? `<span class="rg-chip sg" title="Stop-and-go cumprido">${ICONE.parada}SG</span>` : "",
    r.dsq ? `<span class="rg-chip preta" title="Desclassificado: bandeira preta">${ICONE.preta}Preta</span>` : "",
    danoPct >= 1 ? `<span class="rg-chip dano ${danoPct >= 66 ? "alto" : danoPct >= 33 ? "medio" : "baixo"}" title="Dano no carro: ${danoPct}%">${ICONE.dano}${danoPct}%</span>` : "",
  ].join("");
  const est = r.estimado ? `<abbr class="rg-est" title="Tempo estimado: o robô ainda estava na pista quando o GP acabou">est.</abbr>` : "";
  return `<li class="rg-linha ${eu ? "eu" : ""} ${fora ? "nc" : ""} ${r.pos <= 3 && !fora ? "p" + r.pos : ""}" style="${estiloEq(eq.cor)};--i:${Math.min(i, 14)}">
    <span class="rg-pos">${fora ? "—" : r.pos}</span>
    <span class="rg-piloto">${marca(eq)}<span class="rg-nomes"><span class="rg-l1"><b>${h(nomeDe(p))}</b>${alerta}${r.voltaRapida ? `<i class="rg-vr" title="Volta mais rápida: +1 ponto">${ICONE.rapida}</i>` : ""}${eu ? `<em class="rg-voce">você</em>` : ""}</span><small>${p ? `<span class="rg-sigla">${h(siglaDe(p))}</span>` : ""}${eq.nome ? ` · ${h(eq.nome)}` : ""}</small></span></span>
    <span class="rg-tempo"><span class="rg-t1"><b>${final}</b>${est}</span>${chips ? `<span class="rg-chips">${chips}</span>` : ""}</span>
    <span class="rg-extra"><span class="rg-grid" data-r="Grid">${g}º ${d ? `<small class="${d > 0 ? "sobe" : "desce"}">${d > 0 ? "▲" : "▼"}${Math.abs(d)}</small>` : ""}</span><span class="rg-paradas" data-r="Paradas">${pneusHTML(r, F)}</span><span class="rg-melhor" data-r="Melhor">${r.melhor != null ? fmt(r.melhor) : ""}</span></span>
    <span class="rg-pts">${r.pontos ? `+${r.pontos}` : ""}</span></li>`;
}

// quem aparece no pódio: os 3 primeiros que terminaram
const noPodio = (S) => S.resultado.slice(0, 3).filter((r) => !r.dnf && !r.nc && !r.dsq && r.tempo != null);

function degrauHTML(r, vencedor, ctx) {
  const { S, m } = ctx, p = S.players.find((x) => x.id === r.id), eq = infoEquipe(p), v = r === vencedor, eu = !!(m && r.id === m.id);
  const tempo = v ? fmt(r.tempo) : "+" + (r.tempo - vencedor.tempo).toFixed(3);
  // de cima para baixo: o carro (3D; sem WebGL, o logo grande), o degrau com o número e, embaixo, quem é
  return `<div class="rg-deg d${r.pos} ${eu ? "eu" : ""}" data-id="${h(r.id)}" style="${estiloEq(eq.cor)}">
    <div class="rg-deg-car"><div class="rg-logo-grande">${marca(eq)}</div>${eu ? `<span class="rg-seu">Seu carro</span>` : ""}</div>
    <div class="rg-bloco"><span>${r.pos}</span></div>
    <div class="rg-deg-info">${v ? `<span class="rg-copa">${ICONE.copa}</span>` : ""}${marca(eq)}<b class="rg-deg-nome">${h(nomeDe(p))}</b><small class="rg-deg-eq"><span class="rg-sigla">${h(siglaDe(p))}</span>${eq.nome ? ` · ${h(eq.nome)}` : ""}</small><span class="rg-deg-tempo">${tempo}</span>${r.pontos ? `<span class="rg-deg-pts">+${r.pontos} pts</span>` : ""}</div></div>`;
}

export function htmlResultado(S, m, isHost, aviso) {
  const R = S.resultado, F = window.F1Regras, vencedor = R[0], ctx = { S, m, F, vencedor }, podio = noPodio(S);
  let alto = "";
  if (podio.length && podio[0] === vencedor) {
    const euVenci = !!(m && vencedor.id === m.id), ordem = [podio[1], podio[0], podio[2]].filter(Boolean);
    alto = `<div class="rg-podio ${euVenci ? "vitoria" : ""}" style="${estiloEq(infoEquipe(S.players.find((x) => x.id === vencedor.id)).cor)}">
      ${euVenci ? `<div class="rg-vitoria" role="status"><b>VITÓRIA</b><small>${h(PISTAS[S.config.pista].name)}</small></div>` : ""}
      <div class="rg-degraus" role="list" aria-label="Pódio">${ordem.map((r) => degrauHTML(r, vencedor, ctx)).join("")}</div></div>`;
  }
  return `<div class="placa gp rg-placa"><div class="chk"></div><div class="in"><div class="av-item av-fixo" style="--fundo:#f2f2f5;--txt:#0a0c12;--bloco:#0a0c12">${aviso}</div>
    <h2 class="rg-titulo">${ICONE.copa}<span>GP · ${h(PISTAS[S.config.pista].name)}</span></h2>${alto}
    <div class="rg-cab" aria-hidden="true"><span></span><span>Piloto</span><span>Tempo</span><span class="rg-extra"><span>Grid</span><span>Paradas</span><span>Melhor</span></span><span>Pts</span></div>
    <ol class="rg-tab">${R.map((r, i) => linhaHTML(r, i, ctx)).join("")}</ol>
    <div class="row rg-botoes">${S.temporada ? `<button class="primary" id="rSede">← Voltar à sede</button>` : isHost ? `<button class="primary" id="rAgain">🏁 Novo GP</button><button id="rLobby">Trocar pista</button>` : `<span class="muted">Esperando o organizador…</span>`}${S.temporada ? "" : `<button class="ghost" onclick="location.href='/'">🏠 Vila</button>`}</div></div></div>`;
}

// ---- depois de desenhar: os 3 carros do pódio (ou os logos grandes), o confete de quem ganhou ----
function carrosNoPodio(el, S, m) {
  const podio = el.querySelector(".rg-podio"); if (!podio) return;
  const itens = [];
  for (const r of noPodio(S)) {
    const deg = podio.querySelector(`.rg-deg.d${r.pos}`), p = S.players.find((x) => x.id === r.id);
    if (!deg || !p) continue;
    const eq = infoEquipe(p), pint = eq.pintura && MODS3.pintura[eq.pintura] ? eq.pintura : null;
    const mods = pint ? { ...(p.mods || MODS_PADRAO), pintura: pint } : p.mods;
    const comp = (r.compostos && r.compostos[r.compostos.length - 1]) || p.pneuAtual || p.pneu || null;
    itens.push({ id: r.id, pos: r.pos, slot: deg.querySelector(".rg-deg-car"), bloco: deg.querySelector(".rg-bloco"), cor: p.color, modelo: p.car, mods, corEquipe: eq.cor, numero: p.numero, sigla: p.bot ? p.sigla : null, composto: comp, eu: !!(m && r.id === m.id) });
  }
  try { podio3d.montar(podio, itens); } catch (e) { console.warn("Corrida: pódio 3D", e); podio3d.soltar(); } // sem WebGL (ou erro): ficam os logos grandes
}
export function aposResultado(el, S, m) {
  carrosNoPodio(el, S, m);
  if (el.querySelector(".rg-podio.vitoria") && !reduz() && window.Comum) {
    const eq = infoEquipe(m), cores = [eq.cor, "#ffffff", "#ffd23f", "#e10600", eq.cor];
    window.Comum.confetti(cores, { onde: el, dur: [2.4, 2.4], fica: 6500 });
    setTimeout(() => { if (el.isConnected && !el.classList.contains("hidden")) window.Comum.confetti(cores, { onde: el, dur: [2.2, 2.2], fica: 6000 }); }, 1900);
  }
}
// sai da tela do resultado: solta os carros, a cena e o renderizador (o pódio 3D é só desta tela: nada a ver com o palco da sala)
export function limparResultado() { podio3d.soltar(); }

// a tela só é refeita quando o resultado muda (o servidor manda o estado várias vezes por segundo; refazer reiniciaria a animação e o carro)
let ultima = "";
export function resultadoMudou(el, S, m, isHost) {
  const chave = JSON.stringify([S.startAt, S.resultado.map((r) => [r.id, r.pos, r.tempo, r.pontos, r.dano, r.penal]), S.players.map((p) => [p.id, p.acrescimo, p.equipe]), m && m.id, !!isHost, !!S.temporada, (S.log || []).length]);
  if (chave === ultima && el.firstChild && !el.classList.contains("hidden")) return false;
  podio3d.desprender(); ultima = chave; return true; // (a tela vai ser refeita: os mesmos carros voltam para os degraus novos, sem recarregar)
}

// ---- para ver a tela sem correr um GP: `__corrida.resultadoFalso({ euPos: 1 })` no #debug ----
export function estadoDeExemplo({ euPos = 1, equipe = "ferrari", nome = "Thiago", voltas = 12 } = {}) {
  const FP = window.F1Pilotos, pilotos = FP.PILOTOS.filter((p) => p.equipe !== equipe || p.id === "leclerc").slice(0, 19);
  const euPint = FP.EQUIPES[equipe].pintura, ordem = pilotos.slice();
  ordem.splice(Math.max(0, Math.min(ordem.length, euPos - 1)), 0, null);
  const players = [{ id: "eu", name: nome, bot: false, equipe, numero: 7, sigla: null, pawn: "😎", color: "#e63946", car: "equilibrado", mods: { ...MODS_PADRAO, pintura: euPint }, acrescimo: 0, penal: 0 }];
  const R = [], pts = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  ordem.forEach((pil, i) => {
    const id = pil ? "b" + i : "eu", pos = i + 1;
    if (pil) players.push({ id, name: pil.curto, nomeCompleto: pil.nome, bot: true, equipe: pil.equipe, numero: pil.numero, sigla: pil.sigla, pawn: "🤖", color: FP.EQUIPES[pil.equipe].cor, car: "equilibrado", acrescimo: 0, penal: 0 });
    const p = players.find((x) => x.id === id), r = { id, pos, nc: false, dnf: false, tempo: 5400 + i * 3.37 + (i > 3 ? 2.1 : 0), pontos: pts[i] || 0, voltas, grid: Math.max(0, Math.min(19, i + (i % 3 === 0 ? 2 : -1))), paradas: 1 + (i % 3 === 2 ? 1 : 0), compostos: i % 3 === 2 ? ["macio", "duro", "medio"] : ["medio", "duro"], estimado: i >= 11 && i <= 12, penal: 0, sg: 0, dano: 0, melhor: 88.4 + i * 0.13 };
    if (pos === 3) r.voltaRapida = true;
    if (pos === 4) { p.acrescimo = 5; r.tempo += 5; }
    if (pos === 6) { p.acrescimo = 10; r.penal = 10; r.sg = 0; r.tempo += 10; }
    if (pos === 8) { r.sg = 1; r.penal = 0; }
    if (pos === 5 || pos === euPos + 1) r.dano = 34.4;
    if (pos === 9) r.dano = 2;
    if (pos === 10) r.dano = 71;
    if (pos === 17) { r.dnf = true; r.tempo = null; r.pontos = 0; r.dano = 100; }
    if (pos === 18) { r.nc = true; r.tempo = null; r.pontos = 0; }
    if (pos === 19) { r.dsq = true; r.pontos = 0; }
    if (p.id === "eu" && euPos > 4 && pos === euPos) { p.acrescimo = 5; r.tempo += 5; }
    R.push(r);
  });
  const meu = players.find((x) => x.id === "eu");
  const log = [{ t: 1, text: `⏱️ ${meu.name}: causou uma batida leve, +5 s.` }, { t: 2, text: `⏱️ ${players.find((x) => x.id === "b" + (ordem.length > 5 ? 5 : 1)).name}: ultrapassou o limite da pista, +10 s.` }];
  return { phase: "results", host: "eu", startAt: Date.now(), now: Date.now(), config: { regras: "f1", pista: Object.keys(PISTAS)[0], voltas }, players, resultado: R, log, finishOrder: [], temporada: false, salaTemporada: null };
}
