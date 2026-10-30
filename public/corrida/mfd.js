// Corrida da Galera — o MFD (multi-function display) do HUD de F1: o painel embaixo à direita, com páginas que se alternam.
// Só nas regras de F1. As contas ficam em hud-mfd.js (HudMfd); aqui são o DOM (criado uma vez, atualizado só no que mudou, no ritmo do
// hudF1: ~10x por segundo, e só da página que está à vista) e a entrada: teclado (M/N páginas, Tab ajustar), controle (R3/L3 páginas,
// Start ajustar) e toque (o botão MFD abre e fecha; as abas e as setas ‹ › do painel são clicáveis).
//
// Modo AJUSTAR (`mfd.foco`): as setas do teclado e o direcional do controle deixam de pilotar e navegam no painel (↑↓ a linha, ←→ o valor,
// ou a página nas páginas sem linhas). Sai com Tab, Start, Esc, ou sozinho depois de 8 s sem mexer, para nunca prender o carro.
import { E, $, me, carOf, store, toast } from "./estado.js";
import { race } from "./jogo.js";
import { alternarPedido, escolherComposto, cancelarPedido, jogosDe, textoJogos } from "./box.js";
import { set } from "./hud-painel.js";

const M = () => window.HudMfd, F = () => window.F1Regras;
export const mfd = { aberto: true, foco: false, pagina: "pneus", lista: [], linha: {}, ultimo: 0, entrada: "teclado" };
// o que controles.js registra (a câmera e a torre são dele e do hud.js): { camera(d), torre(): alterna compacta/completa }
export const acoes = { camera: null, camNome: () => "", torreCompacta: () => true, torreAlternar: null };
const LEITURA = {}; // os últimos dados que o hud passou (as linhas do painel leem daqui)
let raiz = null, refs = {}, abas = "", paginaVista = null;

const coarse = () => matchMedia("(pointer:coarse)").matches || innerWidth < 700;
const lerAberto = () => { try { const v = store.get("corrida:mfd"); if (typeof v === "boolean") return v; } catch (e) {} return !coarse(); };
const guardarAberto = () => { try { store.set("corrida:mfd", mfd.aberto); } catch (e) {} };

// ---------- as páginas (o HTML de cada uma, montado uma vez) ----------
const CARRO = (cls) => `<svg class="mp-carro ${cls}" viewBox="0 0 90 120" aria-hidden="true"><rect class="mp-asa" x="18" y="2" width="54" height="7" rx="2"/><rect class="mp-roda" data-r="w0" x="3" y="14" width="19" height="28" rx="5"/><rect class="mp-roda" data-r="w1" x="68" y="14" width="19" height="28" rx="5"/><rect class="mp-roda" data-r="w2" x="2" y="72" width="21" height="30" rx="5"/><rect class="mp-roda" data-r="w3" x="67" y="72" width="21" height="30" rx="5"/><path class="mp-corpo" data-r="corpo" d="M42 9h6l2 22 9 9v22l-5 8 3 28H33l3-28-5-8V40l9-9z"/><rect class="mp-asa" data-r="asaT" x="16" y="108" width="58" height="8" rx="2"/></svg>`;
const linhasDe = (id) => `<div class="mr-lista" data-linhas="${id}"></div>`;
const HTML = {
  pneus: `<div class="mp mp-dupla">${CARRO("pn")}<b class="mp-centro" data-r="pVida">100%</b><div class="mp-dados">
    <div class="mp-comp"><b class="mp-bola" data-r="pLetra">M</b><span data-r="pNome">Médio</span></div>
    <div class="mp-barra"><span>Vida</span><div><i data-r="pVidaB"></i></div><b data-r="pVidaT">100%</b></div>
    <div class="mp-barra"><span>Temp.</span><div><i data-r="pTempB"></i></div><b data-r="pTempT">Frio</b></div>
    <p class="mp-nota" data-r="pNota"></p><p class="mp-nota mp-fraca">Leitura do conjunto de pneus</p></div></div>`,
  danos: `<div class="mp mp-dupla">${CARRO("dn")}<b class="mp-centro" data-r="dPct">0%</b><div class="mp-dados">
    <div class="mp-barra"><span>Dano</span><div><i data-r="dBarra"></i></div><b data-r="dT">0%</b></div>
    <div class="mp-barra"><span>Desempenho</span><div><i data-r="dDes"></i></div><b data-r="dDesT">100%</b></div>
    <p class="mp-nota" data-r="dBatida">Sem batidas</p><p class="mp-nota mp-fraca">Com 100% de dano o carro está destruído (perda total).</p></div></div>`,
  ers: `<div class="mp mp-ers"><div class="mp-grande"><span>BATERIA</span><b data-r="eBat">0%</b></div>
    <div class="mp-barra"><span>Carga</span><div><i data-r="eBatB"></i></div><b data-r="eEst">—</b></div>
    <div class="mp-barra"><span>Recarga da volta</span><div><i data-r="eRecB"></i></div><b data-r="eRecT">0%</b></div>
    <div class="mp-par"><span>Modo</span><b data-r="eModo">—</b></div><div class="mp-par"><span>DRS</span><b data-r="eDrs">—</b></div>
    <div class="mp-par"><span>Combustível</span><b>não medido no jogo</b></div></div>`,
  box: `<div class="mp mp-box"><div class="mp-janela"><small>JANELA DE BOX</small><b data-r="bJan">—</b><em data-r="bSub"></em></div>
    <div class="mp-par"><span>Box agora</span><b data-r="bRet">—</b></div><div class="mp-par"><span>Troca custa</span><b data-r="bPerda">—</b></div>${linhasDe("box")}<p class="mp-nota" data-r="bJogos"></p></div>`,
  tempos: `<div class="mp mp-tempos"><div class="mp-par"><span>Última volta</span><b data-r="tUlt">—:--.---</b></div><div class="mp-par"><span>Melhor volta</span><b data-r="tMelhor">—:--.---</b></div>
    <div class="mp-par"><span>Volta mais rápida</span><b class="roxo" data-r="tVR">—</b></div>
    <div class="mp-par frente"><span>Carro da frente</span><b data-r="tFrente">—</b></div><div class="mp-par tras"><span>Carro de trás</span><b data-r="tTras">—</b></div></div>`,
  classificacao: `<div class="mp mp-classif" data-r="cLista">${'<div class="cl-r hidden"><b></b><i></i><span></span><em></em><u></u></div>'.repeat(24)}</div>`,
  ajustes: `<div class="mp mp-ajustes">${linhasDe("ajustes")}<div class="mp-par"><span>ERS</span><b data-r="aErs">—</b></div><p class="mp-nota mp-fraca">Balanço de freio e mistura de combustível não existem neste carro.</p></div>`,
};

// ---------- as linhas ajustáveis (setas ‹ › ): só o que o jogo de fato muda ----------
const compostosPossiveis = () => ["macio", "medio", "duro", "chuva"].filter((c) => jogosDe(me())[c] > 0);
const LINHAS = {
  box: [
    { rot: "Próximo pneu", valor() { const B = race && race.box; if (!B) return "—"; if (B.fase) return "No box"; return B.pedido ? F().PNEUS[B.pedido].nome : "Sem parada"; },
      mudar(d) {
        const B = race && race.box; if (!B || B.fase) return;
        const op = compostosPossiveis(); if (!op.length) { toast("Sem jogos de pneu: " + textoJogos(me()), 1800); return; }
        const base = B.pedido || (race.pneu && race.pneu.composto) || "medio", i = op.indexOf(base);
        escolherComposto(op[(i < 0 ? (d > 0 ? 0 : op.length - 1) : (i + d + op.length) % op.length)]);
      } },
    { rot: "Pedir box", valor() { const B = race && race.box; return !B ? "—" : B.fase ? "No box" : B.pedido ? "Sim" : "Não"; },
      mudar() { const B = race && race.box; if (!B || B.fase) return; if (B.pedido) cancelarPedido(); else alternarPedido(); } },
  ],
  ajustes: [
    { rot: "Torre", valor: () => (acoes.torreCompacta() ? "Compacta" : "Completa"), mudar() { if (acoes.torreAlternar) acoes.torreAlternar(); } },
    { rot: "Câmera", valor: () => acoes.camNome(), mudar(d) { if (acoes.camera) acoes.camera(d); } },
    { rot: "Rádio", valor: () => (window.Radio && !window.Radio.mudo ? "Ligado" : "Desligado"), mudar() { if (window.Radio) { window.Radio.silenciar(); } } },
  ],
};
const linhasDaPagina = (id = mfd.pagina) => LINHAS[id] || [];

// ---------- montagem ----------
export function montarMfd() {
  if (raiz) return;
  raiz = $("hMfd"); if (!raiz) return;
  mfd.aberto = lerAberto();
  raiz.innerHTML = `<div class="mfd-topo"><b class="mfd-nome" data-r="nome">PNEUS</b><div class="mfd-abas" data-r="abas" role="tablist"></div><button class="mfd-x" data-r="fechar" aria-label="Fechar o MFD" title="Fechar o MFD">▾</button></div>
    <div class="mfd-corpo">${Object.entries(HTML).map(([id, h]) => `<section class="mfd-pg" data-pg="${id}" hidden>${h}</section>`).join("")}</div>
    <div class="mfd-dicas" data-r="dicas"><span class="kb ajuda"><kbd>M</kbd><kbd>N</kbd> página</span><span class="kb ajuda"><kbd>Tab</kbd> ajustar</span><span class="gp ajuda"><kbd class="b">L3</kbd><kbd class="b">R3</kbd> página</span><span class="gp ajuda"><kbd class="b st">Start</kbd> ajustar</span><span class="foco-dica"><kbd>↑</kbd><kbd>↓</kbd> linha</span><span class="foco-dica"><kbd>←</kbd><kbd>→</kbd> valor</span><span class="foco-dica"><kbd>Tab</kbd> sair</span></div>`;
  const q = (sel, ctx = raiz) => ctx.querySelector(sel);
  refs.mfd = {}; for (const el of raiz.querySelectorAll("[data-r]")) refs.mfd[el.dataset.r] = el;
  refs.pg = {}; refs.r = {};
  for (const s of raiz.querySelectorAll(".mfd-pg")) { refs.pg[s.dataset.pg] = s; const r = {}; for (const el of s.querySelectorAll("[data-r]")) r[el.dataset.r] = el; refs.r[s.dataset.pg] = r; }
  // as linhas de cada página (criadas uma vez; o valor muda no lugar)
  for (const [id, lista] of Object.entries(LINHAS)) {
    const caixa = q(`[data-linhas="${id}"]`); if (!caixa) continue;
    lista.forEach((l, i) => {
      const d = document.createElement("div"); d.className = "mr"; d.dataset.i = i;
      d.innerHTML = `<span class="mr-n">${l.rot}</span><span class="mr-v"><button type="button" class="mr-b" data-d="-1" aria-label="${l.rot}: anterior">‹</button><b></b><button type="button" class="mr-b" data-d="1" aria-label="${l.rot}: próximo">›</button></span>`;
      caixa.appendChild(d);
    });
  }
  raiz.addEventListener("click", (e) => {
    const b = e.target.closest("button, .mr"); if (!b) return; mexeu();
    if (b.classList.contains("mfd-x")) return abrir(false);
    if (b.dataset.pg) return irPara(b.dataset.pg);
    const lin = b.closest(".mr");
    if (lin) { mfd.linha[mfd.pagina] = +lin.dataset.i; const d = b.dataset.d; if (d) linhasDaPagina()[+lin.dataset.i].mudar(+d); atualizarLinhas(); }
  });
  const bt = $("bMfd"); if (bt) bt.addEventListener("click", () => { mexeu(); abrir(!mfd.aberto); });
  aplicarAberto();
}
function aplicarAberto() {
  const r = $("race"); if (!raiz || !r) return;
  raiz.classList.toggle("fechado", !mfd.aberto); r.classList.toggle("mfd-on", mfd.aberto);
  const bt = $("bMfd"); if (bt) bt.setAttribute("aria-expanded", String(mfd.aberto));
}
function abrir(v) { mfd.aberto = !!v; if (!v) sairDoFoco(); guardarAberto(); aplicarAberto(); paginaVista = null; }
export function mexeu() { mfd.ultimo = performance.now(); }
// B e o botão de box mostram a estratégia sem tirar as setas da pilotagem.
export function abrirBoxMfd() {
  if (!ativo() || !race.box) return;
  if (!mfd.aberto) abrir(true);
  mfd.pagina = "box"; paginaVista = null; mexeu();
}
function aplicarFoco() { if (raiz) raiz.classList.toggle("foco", mfd.foco); const r = $("race"); if (r) r.classList.toggle("mfd-foco", mfd.foco); }
function sairDoFoco() { if (!mfd.foco) return; mfd.foco = false; aplicarFoco(); }
function alternarFoco() {
  mexeu();
  if (mfd.foco) { sairDoFoco(); return; }
  if (!mfd.aberto) abrir(true);
  mfd.foco = true; aplicarFoco(); atualizarLinhas();
}
function irPara(id) { if (mfd.lista.includes(id)) { mfd.pagina = id; paginaVista = null; mexeu(); } }
function pagina(d) { if (!mfd.aberto) { abrir(true); return; } const p = M().vizinha(mfd.lista, mfd.pagina, d); if (p) { mfd.pagina = p; paginaVista = null; mexeu(); } }
function linhaMover(d) {
  const L = linhasDaPagina(); if (!L.length) return;
  const i = ((mfd.linha[mfd.pagina] || 0) + d + L.length) % L.length; mfd.linha[mfd.pagina] = i; mexeu(); atualizarLinhas();
}
function valorMudar(d) {
  const L = linhasDaPagina(), i = mfd.linha[mfd.pagina] || 0;
  if (!L.length) { pagina(d); return; } // página sem linhas: as setas laterais trocam de página
  L[i].mudar(d); mexeu(); atualizarLinhas();
}

// ---------- a entrada ----------
const ativo = () => !!race && !!E.S && E.S.config.regras === "f1" && race.hudF1 && !!raiz;
// teclado: devolve true se a tecla é do MFD (controles.js então não a trata como pilotagem)
export function mfdTecla(e) {
  if (!ativo() || e.ctrlKey || e.metaKey || e.altKey) return false;
  mfd.entrada = "teclado";
  if (e.code === "Tab") { e.preventDefault(); if (!e.repeat) alternarFoco(); return true; }
  if (e.code === "KeyM" || e.code === "KeyN") { if (!e.repeat) pagina(e.code === "KeyM" ? 1 : -1); return true; }
  if (e.key === "Escape" && mfd.foco) { sairDoFoco(); return false; } // (o Esc também pula a TV: deixa seguir)
  if (!mfd.foco) return false;
  const k = e.key;
  if (k === "ArrowUp" || k === "ArrowDown" || k === "ArrowLeft" || k === "ArrowRight") {
    e.preventDefault(); if (!e.repeat) { if (k === "ArrowUp") linhaMover(-1); else if (k === "ArrowDown") linhaMover(1); else valorMudar(k === "ArrowLeft" ? -1 : 1); }
    return true;
  }
  return false;
}
// controle: `hit(i)` é o botão que acabou de ser apertado. Devolve true com o MFD em modo ajustar (o direcional não pilota).
export function mfdPad(hit) {
  if (!ativo()) return false;
  if (hit(9) || hit(10) || hit(11)) mfd.entrada = "pad";
  if (hit(9)) alternarFoco();
  if (hit(11)) pagina(1);
  if (hit(10)) pagina(-1);
  if (mfd.foco) {
    if (hit(12)) { mfd.entrada = "pad"; linhaMover(-1); } if (hit(13)) { mfd.entrada = "pad"; linhaMover(1); }
    if (hit(14)) { mfd.entrada = "pad"; valorMudar(-1); } if (hit(15)) { mfd.entrada = "pad"; valorMudar(1); }
  }
  return mfd.foco;
}
export const mfdEmFoco = () => mfd.foco && ativo();

// ---------- a atualização (hudF1 chama a ~10x por segundo) ----------
function atualizarLinhas() {
  if (!refs.pg) return;
  const L = linhasDaPagina(), caixa = refs.pg[mfd.pagina] && refs.pg[mfd.pagina].querySelector("[data-linhas]"); if (!caixa) return;
  const sel = mfd.linha[mfd.pagina] || 0;
  L.forEach((l, i) => { const d = caixa.children[i]; if (!d) return; set(d, "c", "mr" + (i === sel ? " sel" : "")); set(d.querySelector("b"), "t", l.valor()); });
}
// a lista de páginas e as abas (só reconstruídas quando mudam)
function listaDePaginas(ctx) {
  const m = ctx.m, lista = M().paginasDisponiveis({ f1: true, pneu: !!race.pneu, eu: !!m, ers: !!race.ers, box: !!race.box, compacta: ctx.compacta, total: ctx.st.length });
  if (lista.join() !== mfd.lista.join()) mfd.lista = lista;
  if (!lista.includes(mfd.pagina)) { mfd.pagina = lista[0]; paginaVista = null; }
  const chave = lista.join();
  if (chave !== abas) {
    abas = chave;
    refs.mfd.abas.innerHTML = lista.map((id, i) => `<button type="button" role="tab" data-pg="${id}" title="${M().nomeDaPagina(id)}" aria-label="${M().nomeDaPagina(id)}">${i + 1}</button>`).join("");
  }
}
export function atualizarMfd(ctx) {
  if (!raiz) return;
  const t = performance.now();
  if (mfd.foco && t - mfd.ultimo > 8000) sairDoFoco(); // ninguém mexeu: devolve as setas ao carro
  raiz.dataset.entrada = mfd.entrada;
  const rr = $("race"); if (rr && rr.dataset.entrada !== mfd.entrada) rr.dataset.entrada = mfd.entrada;
  Object.assign(LEITURA, ctx);
  listaDePaginas(ctx);
  if (!mfd.aberto) return;
  if (paginaVista !== mfd.pagina) {
    paginaVista = mfd.pagina;
    for (const [id, s] of Object.entries(refs.pg)) s.hidden = id !== mfd.pagina;
    set(refs.mfd.nome, "t", M().nomeDaPagina(mfd.pagina));
    for (const b of refs.mfd.abas.children) { const on = b.dataset.pg === mfd.pagina; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); }
  }
  (ATU[mfd.pagina] || (() => {}))(ctx, refs.r[mfd.pagina]);
  atualizarLinhas();
}

const F1U = () => window.F1Regras;
const pc = (v) => Math.round(Math.max(0, Math.min(1, v)) * 100);
const corRodas = (r, nivel) => { for (const k of ["w0", "w1", "w2", "w3"]) set(r[k], "c", "mp-roda " + nivel); };
const ATU = {
  pneus(ctx, r) {
    const pn = race.pneu; if (!pn) return;
    const F = F1U(), e = M().estadoDoPneu(pn, F), tipo = F.PNEUS[pn.composto] || F.PNEUS[F.COMPOSTO_PADRAO];
    corRodas(r, e.nivel); set(r.pVida, "t", e.vida + "%");
    set(r.pLetra, "t", window.HudTorre.LETRA[pn.composto] || "M"); set(r.pLetra, "style", `--c:${tipo.cor}`); set(r.pNome, "t", tipo.nome);
    set(r.pVidaB, "w", e.vida + "%"); set(r.pVidaB, "c", e.nivel); set(r.pVidaT, "t", e.vida + "%");
    set(r.pTempB, "w", pc(e.tempPct) + "%"); set(r.pTempB, "c", e.temp === "Ideal" ? "bom" : e.temp === "Quente" ? "baixo" : "frio"); set(r.pTempT, "t", e.temp);
    const v = ctx.tp;
    set(r.pNota, "t", e.nivel === "fim" ? "Passou do limite: o pneu despenca. Faça a parada." : v && v.voltas < 90 ? `Aguenta ~${Math.max(0, Math.floor(v.voltas))} volta${Math.floor(v.voltas) === 1 ? "" : "s"}${v.medida ? " (no seu ritmo)" : ""}` : "");
  },
  danos(ctx, r) {
    const m = ctx.m; if (!m) return; const d = Math.round(m.dano || 0), des = Math.round(F1U().efeitoDoDano(m.dano || 0).final * 100), nivel = d >= 66 ? "fim" : d >= 33 ? "medio" : "bom";
    set(r.dPct, "t", d + "%"); set(r.dT, "t", d + "%"); set(r.dBarra, "w", Math.min(100, d) + "%"); set(r.dBarra, "c", d >= 66 ? "baixo" : d >= 33 ? "medio" : "bom");
    set(r.dDes, "w", des + "%"); set(r.dDesT, "t", des + "%"); corRodas(r, "neutra"); set(r.corpo, "c", "mp-corpo " + nivel); set(r.asaT, "c", "mp-asa " + nivel);
    const b = m.ultimaBatida; set(r.dBatida, "t", b ? `Última batida: ${b.nivel === "media" ? "média" : b.nivel} (+${Math.round(b.dano)}%)` : "Sem batidas");
  },
  ers(ctx, r) {
    const ers = race.ers; if (!ers) return; const F = F1U(), carga = pc(ers.carga), m = ctx.modoErs;
    set(r.eBat, "t", carga + "%"); set(r.eBatB, "w", carga + "%"); set(r.eBatB, "c", race.ersAtivo ? "on" : carga < 20 ? "baixo" : carga < 50 ? "medio" : "bom"); set(r.eEst, "t", m ? m.texto : "—");
    const rec = pc((ers.recarga || 0) / F.ERS_MAX_RECARGA); set(r.eRecB, "w", rec + "%"); set(r.eRecT, "t", rec + "%");
    set(r.eModo, "t", E.S.config.ers === "manual" ? "Manual (segure E)" : "Automático");
    const pronto = !!ctx.m && ctx.m.drsZona >= 0; set(r.eDrs, "t", race.drsAtivo ? "Aberto" : pronto ? "Disponível na zona" : "Indisponível");
  },
  box(ctx, r) {
    const m = ctx.m, F = F1U(), B = race.box; if (!m || !B) return;
    const j = ctx.janela;
    if (B.fase) { set(r.bJan, "t", "NO BOX"); set(r.bSub, "t", ""); }
    else if (!j) { set(r.bJan, "t", "—"); set(r.bSub, "t", ""); }
    else if (!j.precisa) { set(r.bJan, "t", "SEM PARADA"); set(r.bSub, "t", j.motivo); }
    else { set(r.bJan, "t", j.abre === j.fecha ? `VOLTA ${j.abre}` : `VOLTA ${j.abre} – ${j.fecha}`); set(r.bSub, "t", j.motivo || "janela estimada pelo desgaste"); }
    set(r.bRet, "t", ctx.retorno ? `Volta em ${ctx.retorno}º (est.)` : "—"); set(r.bPerda, "t", ctx.perda != null ? `~${ctx.perda.toFixed(0)} s` : "—");
    set(r.bJogos, "t", "Jogos: " + textoJogos(m));
  },
  tempos(ctx, r) {
    const m = ctx.m, M_ = M(); if (!m) return;
    set(r.tUlt, "t", M_.tempoVolta(m.last)); set(r.tMelhor, "t", M_.tempoVolta(m.best));
    const vr = ctx.vr; set(r.tVR, "t", vr ? `${vr.sigla || vr.name} · ${M_.tempoVolta(vr.best)}` : "—");
    const nome = (id) => { const p = ctx.st.find((x) => x.id === id); return p ? (p.p.sigla || String(p.p.name || "").slice(0, 3).toUpperCase()) : ""; };
    const i = ctx.int || {};
    set(r.tFrente, "t", i.frente ? `${nome(i.frente.id)} ${M_.intervalo(i.frente.seg, "-")} s` : "—"); set(r.tTras, "t", i.tras ? `${nome(i.tras.id)} ${M_.intervalo(i.tras.seg, "+")} s` : "—");
  },
  classificacao(ctx, r) {
    const rows = r.cLista.children, F = F1U();
    for (let k = 0; k < rows.length; k++) {
      const d = rows[k], l = ctx.linhas[k]; set(d, "c", l ? "cl-r" + (l.eu ? " eu" : "") : "cl-r hidden"); if (!l) continue;
      const c = d.children; set(c[0], "t", l.pos); set(c[1], "bg", l.cor); set(c[2], "t", l.sigla); set(c[3], "t", l.dif.texto);
      set(c[4], "t", l.letra); set(c[4], "col", (F.PNEUS[l.pneu] || F.PNEUS.medio).cor);
    }
  },
  ajustes(ctx, r) { set(r.aErs, "t", E.S.config.ers === "manual" ? "Manual (tecla E / botão ERS)" : "Automático (da sala)"); },
};
