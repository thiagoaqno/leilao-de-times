// Corrida da Galera — o placar da corrida e o resultado.
import { E, PISTAS, $, h, sNow, me, P, act, fmt, SECTORS, checkpoint, toast } from "./estado.js";
import { Sound } from "./sons.js";
import { race } from "./jogo.js";
import { textoJogos } from "./box.js";
import { lapDone, deltaBest, myProg } from "./fantasma.js";
import { drawItemHud } from "./itens.js";
import { clima } from "./clima.js";

// ---------- placar da corrida ----------
export function standings() {
  if (!E.S || !race) return [];
  const rows = E.S.players.map((p) => {
    const gh = race.ghosts.get(p.id);
    // regras de F1: a ordem é a do servidor (o progresso de todos, medido por ele no mesmo instante), igual em todas as telas;
    // o meu progresso previsto andaria à frente e cada um se veria na frente do outro. Nas outras salas, o meu é o local.
    const prog = E.ME && p.id === E.ME.id ? (race.net && race.progServidor != null ? race.progServidor : myProg()) : gh ? gh.prog : -1e9;
    return { id: p.id, p, prog, done: p.finish != null ? p.finish + (p.acrescimo || 0) : null }; // regras de F1: os acréscimos (um composto só, limitador) contam
  });
  return rows.sort((a, b) => (a.done != null || b.done != null ? (a.done ?? 1e9) - (b.done ?? 1e9) : b.prog - a.prog));
}
export function hud() {
  if (!E.S) return;
  drawItemHud();
  const m = me(), st = standings(), now = sNow(), cfg = E.S.config, tr = race.tr;
  const left = (race.startAt - now) / 1000;
  // contagem 3, 2, 1, VAI! (nas regras de F1 a largada são as cinco luzes: sem número, só o apito quando apagam)
  const luz = !!race.luzes;
  let big = "";
  if (left > 0) { const n = Math.ceil(left); big = !luz && n <= 3 ? String(n) : ""; if (!luz && n <= 3 && race.beeped !== n) { race.beeped = n; Sound.beep(false); } }
  else if (left > -1) { big = luz ? "" : "VAI!"; if (race.beeped !== 0) { race.beeped = 0; Sound.beep(true); radioF1("largada"); } }
  luzesDaLargada(left);
  const f1on = cfg.regras === "f1" && E.S.phase === "race"; // o HUD novo (torre e painel) só nas regras de F1; no arcade fica o antigo
  const f1av = cfg.regras === "f1"; // os avisos no estilo da transmissão valem em toda a pista de F1 (classificação e corrida)
  if (race.avF1 !== f1av) { race.avF1 = f1av; $("race").classList.toggle("f1avisos", f1av); }
  if (race.hudF1 !== f1on) { race.hudF1 = f1on; $("race").classList.toggle("f1hud", f1on); race.hudQuadro = null; }
  if (m && m.finish != null && E.S.phase === "race") big = "";
  $("hBig").textContent = big;
  $("hBig").style.color = left > 0 ? "#ff4d4d" : "#2ecc71";
  // progresso da corrida inteira (como "42% Progresso"), a barra fininha embaixo e a linha de volta, posição e tempo
  const lider = st[0], meuProg = m ? (m.finish != null ? 1 : Math.max(0, myProg()) / (cfg.voltas * tr.n)) : lider ? Math.max(0, lider.prog) / (cfg.voltas * tr.n) : 0;
  const pct = Math.max(0, Math.min(100, Math.floor(meuProg * 100)));
  if (race.hudPct !== pct) { race.hudPct = pct; $("hProg").textContent = pct + "%"; $("hBarra").style.width = pct + "%"; }
  if (m) {
    const pos = st.findIndex((r) => r.id === m.id) + 1;
    $("hPos").innerHTML = `${pos}º<small>/${st.length}</small>`;
    const lap = Math.min(cfg.voltas, (m.started ? m.laps : 0) + 1);
    $("hLap").textContent = m.finish != null ? "Chegada!" : `Volta ${lap}/${cfg.voltas}`;
    const t = m.finish != null ? m.finish : Math.max(0, (now - race.startAt) / 1000);
    $("hTime").textContent = `${fmt(t)}${m.best != null ? ` · melhor ${fmt(m.best)}` : ""}`;
    velocimetro(Math.abs(race.car.v));
    const d = deltaBest(), el = $("hDelta");
    el.textContent = d == null ? (race.best ? `🏆 recorde ${fmt(race.best.t)}` : "") : `${d < 0 ? "−" : "+"}${Math.abs(d).toFixed(2)} s do recorde`;
    el.className = "time num " + (d == null ? "" : d < 0 ? "ahead" : "behind");
  } else { $("hPos").innerHTML = "👀"; $("hLap").textContent = "Assistindo"; $("hTime").textContent = fmt(Math.max(0, (now - race.startAt) / 1000)); velocimetro(Math.abs(lider ? race.ghosts.get(lider.id)?.v || 0 : 0)); }
  const f1 = cfg.regras === "f1", pneuDe = (p) => (f1 ? ` <u class="pn" style="--c:${window.F1Regras.PNEUS[p.pneuAtual || p.pneu].cor}"></u>${p.paradas ? ` <em>${p.paradas}P</em>` : ""}${p.noBox ? ` <em class="box">BOX</em>` : ""}` : "");
  $("hF1").classList.toggle("hidden", !f1 || E.S.phase === "quali");
  if (f1) {
    const d = E.S.direcao, setor = Math.floor(race.idx / (tr.n / SECTORS));
    $("hBandeira").textContent = d?.safety ? "🚨 SAFETY CAR · fila, sem ultrapassar" : d?.amarelo?.setor === setor ? "🟡 AMARELA · reduza" : m?.azul ? "🔵 AZUL · deixe passar" : m && m.avisosLimite ? `⚫⚪ Limites: ${m.avisosLimite}/4` : "🟢 Pista livre";
    $("hDrs").textContent = race.drsAtivo ? "DRS ABERTO" : m?.drsZona >= 0 ? "DRS disponível na zona" : "DRS indisponível";
    $("hDrs").classList.toggle("aberto", !!race.drsAtivo);
    $("hErsCarga").style.width = `${Math.round((race.ers?.carga || 0) * 100)}%`;
    $("hErsTexto").textContent = `${Math.round((race.ers?.carga || 0) * 100)}%${race.ersAtivo ? " ⚡" : ""}`;
  }
  const quadro = f1on ? "" : st.slice(0, 8).map((r, i) => `<div class="${m && r.id === m.id ? "eu" : ""}"><span>${i + 1}</span><i style="background:${r.p.color}"></i>${h(r.p.name)}${r.p.bot ? " <em>CPU</em>" : ""}${pneuDe(r.p)}${r.done != null ? " 🏁" : ""}</div>`).join("");
  if (!f1on && E.S.phase !== "quali" && race.hudQuadro !== quadro) { race.hudQuadro = quadro; $("hBoard").innerHTML = quadro; }
  if (m && race.hudChip !== m.name) { race.hudChip = m.name; $("hChip").innerHTML = `<i style="background:${m.color}"></i>${h(m.name)}<span>${h(PISTAS[cfg.pista].name)}</span>`; }
  // avisos
  let msg = "";
  const B = race.box, nomeBox = B && (B.fase ? B.composto : B.pedido) ? window.F1Regras.PNEUS[B.fase ? B.composto : B.pedido].nome : "";
  if (m && m.dnf) msg = "💥 PERDA TOTAL: o carro está destruído, você está fora";
  else if (B && B.fase) msg = B.fase === "entra" ? `🔧 BOX: limitador de velocidade` : B.fase === "parada" ? `🔧 ${window.F1Regras.textoDaParada(B.parada)} · trocando para o ${nomeBox} · ${Math.max(0, B.parada - B.t).toFixed(1)} s` : "🔧 BOX: saindo, pneu novo ainda frio";
  else if (E.S.direcao?.safety) msg = "🚨 SAFETY CAR: reduza e mantenha a posição";
  else if (E.S.direcao?.amarelo?.setor === Math.floor(race.idx / (tr.n / SECTORS))) msg = "🟡 BANDEIRA AMARELA: não ultrapasse";
  else if (B && B.pedido) msg = `🔧 BOX: ${nomeBox} (1, 2, 3, 4 trocam · B cancela) · jogos ${textoJogos(m)}`;
  else if (m && m.balaUntil > now) msg = "🚀 BALA! (piloto automático)";
  else if (m && m.spinUntil > now) msg = "💥 ATINGIDO!";
  else if (m && m.shrinkUntil > now) msg = "⚡ ENCOLHIDO PELO RAIO!";
  else if (race.wrong > 1) msg = "⚠️ CONTRAMÃO! (aperte ↺)";
  else if (race.perdeu >= 0 && m && m.finish == null) msg = "⟲ CHECKPOINT PERDIDO: volte nele ou aperte ↺";
  else if (race.cpT > now - 900 && race.sector > 0) msg = `✓ CHECKPOINT ${race.sector}/${SECTORS}`;
  else if (m && m.finish == null && m.started && m.laps === cfg.voltas - 1 && cfg.voltas > 1 && race.lastLapMsg > now - 2500) msg = "ÚLTIMA VOLTA!";
  else if (race.pneu && race.pneu.desgaste > window.F1Regras.PENHASCO && m && m.finish == null && m.started) { msg = "PNEU NO FIM: segura nas curvas"; radioF1("box"); }
  else if (E.S.endAt && m && m.finish == null) msg = `⏱️ ${Math.max(0, Math.ceil((E.S.endAt - now) / 1000))} s para cruzar`;
  if (!msg && race.newRecord > now - 3000) msg = "🏆 NOVO RECORDE!";
  if (B) { // o botão do box no estilo da TV: o rótulo, a tecla B e, com a parada pedida (ou em andamento), a bolinha e o nome do pneu
    const bt = $("bBox"), ativo = !!(B.pedido || B.fase), k = ativo ? (B.fase ? "d:" : "p:") + nomeBox : "", pn = ativo && window.F1Regras.PNEUS[B.fase ? B.composto : B.pedido];
    if (bt.dataset.k !== k) {
      bt.dataset.k = k; bt.classList.toggle("pedido", ativo); bt.classList.toggle("dentro", !!B.fase);
      bt.innerHTML = pn ? `<span class="bx-rot">${B.fase ? "No box" : "Box"}</span><span class="bx-pneu"><u class="pn" style="--c:${pn.cor}"></u>${h(pn.nome)}</span>` : `<span class="bx-rot">Box</span><kbd>B</kbd>`;
    }
  }
  if (f1av) { if (E.S.phase !== "quali") estadoF1(msg || (f1on ? bandeiraF1(m) : "")); } else $("hMsg").textContent = msg;
  if (!f1av) avisoDeBatida(m); // (nas regras de F1 a batida vem do log da direção de prova)
  if (f1av) avisosF1(m, left, now);
  if (E.S.phase === "quali") hudClassificacao(m, now);
  // vácuo e estilingue
  const dr = race.sling > 0 ? 1 : race.draft;
  const hd = $("hDraft");
  const star = m && m.starUntil > now;
  hd.innerHTML = star ? "⭐ ESTRELA!" : race.sling > 0 ? "🚀 ESTILINGUE!" : race.arSujo > 0.03 ? `🌀 AR SUJO<i style="width:${Math.round(race.draft * 100)}%"></i>` : race.draft > 0.15 ? `💨 VÁCUO<i style="width:${Math.round(race.draft * 100)}%"></i>` : race.catchup > 0.025 ? "⚡ PELOTÃO À VISTA" : "";
  hd.style.opacity = star || race.sling > 0 || race.draft > 0.15 || race.catchup > 0.025 ? 1 : 0;
  if (f1on) hudF1(m, st, now);
  if ((race.hudVez = (race.hudVez || 0) + 1) % 2 === 0) minimapa(st, m); // o minimapa a cada 2 quadros já basta
}
// ---------- o HUD de F1 (regras de F1): a torre de posições à esquerda, o painel embaixo à direita ----------
// Tudo em DOM, criado uma vez e atualizado só no que mudou, no máximo 10 vezes por segundo. As contas (diferença para o líder,
// ordem, recorte) ficam em hud-torre.js. A diferença é a distância até o líder dividida pela velocidade de quem vem atrás
// (média suavizada de `gh.v`, o fantasma, ou de `race.car.v`, o meu carro); `prog` vem de `standings()`.
const set = (el, prop, v) => {
  const c = el._v || (el._v = {}); if (c[prop] === v) return; c[prop] = v;
  if (prop === "t") el.textContent = v; else if (prop === "c") el.className = v; else if (prop === "w") el.style.width = v; else if (prop === "bg") el.style.background = v; else if (prop === "col") el.style.color = v; else if (prop === "d") el.style.display = v; else el.setAttribute(prop, v);
};
const LOGO_F1 = '<svg class="f1logo" viewBox="0 0 64 26" aria-label="F1"><path d="M0 26L9 0H64L55 26Z" fill="#e10600"/><text x="31" y="21" text-anchor="middle" font-family="Titillium Web,Arial,sans-serif" font-weight="900" font-style="italic" font-size="22" fill="#fff">F1</text></svg>';
const N_RPM = 12; // os segmentos da barra de rotação (verde, vermelho e azul no corte)
function montarTorre() {
  const el = $("hTorre"); if (el.dataset.ok) return; el.dataset.ok = 1;
  el.innerHTML = `<div class="tt-topo">${LOGO_F1}<b id="tVolta">VOLTA 1 / 1</b></div><div id="tLinhas"></div>`;
  const box = $("tLinhas");
  for (let i = 0; i < 22; i++) { const d = document.createElement("div"); d.className = "tl hidden"; d.innerHTML = '<span class="n"></span><i class="eq"></i><b class="sg"></b><em class="df"></em><u class="pn"></u><s class="vr" title="Volta mais rápida"></s><small class="ic"></small>'; box.appendChild(d); }
  $("hPainel").innerHTML = '<div class="pf-over" id="pOver">OVERTAKE</div><div class="pf-caixa"><div class="pf-vel"><div class="pf-marcha" id="pMarcha">N</div><b id="pVel">0</b><span>km/h</span></div><div class="pf-rpm" id="pRpm">' + "<i></i>".repeat(N_RPM) + '</div><div class="pf-boost"><span>BOOST</span><div><i id="pBoost"></i></div><b id="pBoostT">0%</b></div><div class="pf-extra"><div class="pf-pneu" id="pPneu" title="Pneu: letra do composto e desgaste"><b>M</b><span>0%</span></div><div class="pf-dano"><span id="pDanoT">DANO 0%</span><div><i id="pDano"></i></div></div></div></div>';
}
// o engenheiro no rádio (radio.js): só nas regras de F1
const radioF1 = (situacao, op) => { if (window.Radio && E.S && E.S.config && E.S.config.regras === "f1") window.Radio.dizer(situacao, op); };
// ---------- os avisos no estilo da transmissão de F1 (avisos-f1.js tem as regras: tipos, cores, fila) ----------
// Faixas retas com a cor da bandeira, o ícone, o cabeçalho ("DIREÇÃO DE PROVA · RACE CONTROL" ou o tipo do aviso) e o texto. A fila
// mostra até 3 de uma vez e os outros esperam; o DOM só muda quando a fila muda (versao) ou o texto de uma faixa muda.
const LOGO_AVISO = LOGO_F1.replace('class="f1logo"', 'class="f1logo av-logo"');
const NOS_AVISOS = new Map();
let FILA_AVISOS = null;
const filaAvisos = () => FILA_AVISOS || (FILA_AVISOS = window.AvisosF1.criarFila());
export function htmlAviso(tipo, texto) {
  const A = window.AvisosF1, t = A.tipoDe(tipo);
  const cab = t.direcao ? '<b>DIREÇÃO DE PROVA</b><small>RACE CONTROL</small>' : `<b>${t.rotulo}</b>`;
  return `<span class="av-bloco">${A.iconeDe(tipo)}</span><span class="av-corpo"><span class="av-cab">${cab}${LOGO_AVISO}</span><span class="av-txt">${h(texto)}</span></span>`;
}
function estiloAviso(el, tipo) { const t = window.AvisosF1.tipoDe(tipo); el.style.setProperty("--fundo", t.fundo); el.style.setProperty("--txt", t.txt); el.style.setProperty("--bloco", t.bloco); }
// um aviso de fora (toast, tela de fim): vira uma faixa da fila
E.avisarF1 = (texto, ms) => { const A = window.AvisosF1, l = A.limpar(texto); if (l && window.Radio && (A.tipoDoTexto(texto) !== "vmr" || (me() && texto.includes(me().name)))) window.Radio.avisoF1(A.tipoDoTexto(texto)); if (l) filaAvisos().empurrar({ tipo: A.tipoDoTexto(texto), texto: l, ttl: Math.max(2600, (ms || 3200) + 1200) }, Date.now()); };
// o aviso que dura enquanto a situação dura (bandeira, box, perda total...): uma faixa só, troca o texto no lugar
function estadoF1(texto) {
  const A = window.AvisosF1, f = filaAvisos(), l = A.limpar(texto);
  if (l && window.Radio) { const t = A.tipoDoTexto(texto); window.Radio.avisoF1(t); if (/perda total/i.test(texto)) window.Radio.uma("dnf:" + (E.S && E.S.startAt), () => window.Radio.fim(0, 0, true)); }
  if (!l) f.remover("estado"); else f.empurrar({ chave: "estado", tipo: A.tipoDoTexto(texto), texto: l, fixo: true }, Date.now());
}
function desenharAvisos() {
  const box = $("avisosF1"); if (!box) return;
  const f = filaAvisos(), lista = f.visiveis(Date.now());
  if (box._versao === f.versao) return; box._versao = f.versao;
  const vivos = new Set();
  for (const a of lista) {
    vivos.add(a.id);
    let n = NOS_AVISOS.get(a.id);
    if (!n) { n = document.createElement("div"); n.className = "av-item"; n._tipo = a.tipo; n._txt = a.texto; estiloAviso(n, a.tipo); n.innerHTML = htmlAviso(a.tipo, a.texto); NOS_AVISOS.set(a.id, n); box.appendChild(n); }
    else if (n._tipo !== a.tipo || n._txt !== a.texto) { n._tipo = a.tipo; n._txt = a.texto; estiloAviso(n, a.tipo); n.innerHTML = htmlAviso(a.tipo, a.texto); }
  }
  for (const [id, n] of NOS_AVISOS) if (!vivos.has(id)) { NOS_AVISOS.delete(id); n.classList.add("sai"); setTimeout(() => n.remove(), 320); } // sai com a animação (CSS) e só então some do DOM
}
// o que vira aviso a cada quadro: as linhas novas do log da direção de prova, o DRS liberado, a volta mais rápida, a largada e a bandeirada
function avisosF1(m, left, now) {
  const A = window.AvisosF1, f = filaAvisos(), agora = Date.now();
  if (!race.avIni) { race.avIni = true; f.limpar(); NOS_AVISOS.clear(); const box = $("avisosF1"); if (box) { box.innerHTML = ""; box._versao = -1; } race.logVisto = null; }
  const S = E.S, nome = m && m.name;
  const lg = A.novosDoLog(S.log, race.logVisto, sNow()); race.logVisto = lg.visto;
  for (const l of lg.novos) { const a = A.deLinha(l.text, nome); if (a) f.empurrar(a, agora); }
  if (S.phase === "race") {
    // as luzes: aviso fixo até apagarem, e a largada
    if (race.luzes && left > 0) f.empurrar({ chave: "luzes", tipo: "largada", texto: "Largada: pé fora do acelerador até as luzes apagarem", fixo: true }, agora);
    else { f.remover("luzes", agora); if (race.luzes && left <= 0 && left > -2 && !race.avLargou) { race.avLargou = true; f.empurrar({ tipo: "largada", texto: "Luzes apagadas: é largada!", ttl: 3000 }, agora); } }
    // o DRS liberado para mim
    const z = m && m.drsZona >= 0 ? m.drsZona : -1;
    if (z >= 0 && race.avDrs !== z) f.empurrar({ tipo: "drs", texto: "DRS liberado: ataque na zona de detecção", ttl: 3200 }, agora);
    race.avDrs = z;
    // a volta mais rápida da corrida: muda quando alguém baixa o tempo
    let melhor = null; for (const p of S.players) if (p.best != null && (!melhor || p.best < melhor.best)) melhor = p;
    if (melhor && (race.avVmr == null || melhor.best < race.avVmr - 1e-6)) { if (race.avVmr != null || S.players.length) f.empurrar({ tipo: "vmr", texto: `${melhor.sigla || melhor.name} · ${fmt(melhor.best)}`, ttl: 4200 }, agora); race.avVmr = melhor.best; }
    // minha bandeirada
    if (m && m.finish != null && !race.avFim) { race.avFim = true; f.empurrar({ tipo: "chegada", texto: "Bandeirada! Você cruzou a linha de chegada", ttl: 6000 }, agora); }
  }
  desenharAvisos();
}
// o que não é mensagem de corrida mas a direção de prova manda: a bandeira azul e os limites da pista
function bandeiraF1(m) {
  if (m && m.azul) return "BANDEIRA AZUL: deixe passar";
  if (m && m.avisosLimite) return `LIMITES DA PISTA ${m.avisosLimite}/4`;
  return "";
}
// O engenheiro avisa uma volta antes (no mínimo AVISO_S segundos) que a chuva vai chegar ou parar: a fala no rádio (radio.js, sem o
// mp3 fica em silêncio) e um aviso na tela. Uma vez por mudança do roteiro (a hora dela entra na chave).
const AVISO_CHUVA = { comeca: ["chuvachegando", "🌧️ Rádio: chuva chegando em uma volta"], para: ["chuvaparando", "🌤️ Rádio: a chuva está parando, a pista vai secar"] };
function avisoDeChuva(m) {
  const S = E.S, F = window.F1Regras;
  if (!m || m.finish != null || S.phase !== "race" || !S.clima || !S.clima.chove || !F.proximaMudanca || !(clima.t >= 0)) return;
  const mud = F.proximaMudanca(S.clima, clima.t), aviso = mud && AVISO_CHUVA[mud.tipo];
  if (!aviso || mud.em > Math.max(F.AVISO_S, m.last || m.best || 0) || (mud.tipo === "para" && !(clima.chuva > 0))) return;
  const vistos = race.chuvaAvisada || (race.chuvaAvisada = new Set()), chave = S.startAt + ":" + mud.quando;
  if (vistos.has(chave)) return; vistos.add(chave);
  radioF1(aviso[0], { forcar: true }); toast(aviso[1], 4200);
}
function hudF1(m, st, now) {
  const t0 = performance.now(); if (t0 - (race.hudF1T || 0) < 100) return; race.hudF1T = t0;
  avisoDeChuva(m);
  if (race.pneu && m && m.finish == null && m.started && race.pneu.desgaste > window.F1Regras.PENHASCO * 0.75 && race.pneu.desgaste <= window.F1Regras.PENHASCO) radioF1("pneu");
  montarTorre();
  const T = window.HudTorre, F = window.F1Regras, tr = race.tr, cfg = E.S.config;
  if (!race.hudEsc) { let L = 0; for (let i = 0; i < tr.n; i++) { const a = tr.pts[i], b = tr.pts[(i + 1) % tr.n]; L += Math.hypot(b.x - a.x, b.y - a.y); } race.hudEsc = L / tr.n; } // unidades de pista por índice
  const vs = race.hudV || (race.hudV = {}), eqs = window.F1Pilotos ? window.F1Pilotos.EQUIPES : {};
  const cors = st.map((r) => {
    const p = r.p, gh = race.ghosts.get(r.id), v = m && r.id === m.id ? Math.abs(race.car.v) : gh && gh.v ? Math.abs(gh.v) : 0;
    vs[r.id] = vs[r.id] == null ? v : vs[r.id] + (v - vs[r.id]) * 0.3;
    return { id: r.id, prog: r.prog, v: vs[r.id], dnf: !!p.dnf, noBox: !!p.noBox, penal: p.penal || 0, done: r.done, best: p.best, pneu: p.pneuAtual || p.pneu, sigla: p.sigla || String(p.name || "???").slice(0, 3).toUpperCase(), nome: p.name, cor: (eqs[p.equipe] || {}).cor || p.color, bot: p.bot };
  });
  const linhas = T.torre(cors, { n: tr.n, meuId: m && m.id, esc: race.hudEsc });
  // a volta no topo é a do líder (como na TV)
  const lid = st[0] && st[0].p, volta = lid ? Math.max(1, Math.min(cfg.voltas, (lid.started ? lid.laps : 0) + 1)) : 1;
  set($("tVolta"), "t", lid && lid.finish != null ? "BANDEIRADA" : `VOLTA ${volta} / ${cfg.voltas}`);
  const max = Math.max(6, Math.min(22, Math.floor((innerHeight - 150) / (innerWidth < 700 ? 22 : 28)))), eu = linhas.findIndex((l) => l.eu);
  if (eu >= 0 && window.Radio && m && m.started && !m.dnf && m.finish == null) window.Radio.posicao(linhas[eu].pos, String(race.startAt));
  const ver = T.recortar(linhas.length, eu, max), box = $("tLinhas").children;
  for (let k = 0; k < box.length; k++) {
    const d = box[k], l = ver[k] != null ? linhas[ver[k]] : null;
    set(d, "c", l ? "tl" + (l.eu ? " eu" : "") + (l.pos === 1 ? " p1" : "") + (l.dif.tipo === "out" ? " out" : "") : "tl hidden");
    if (!l) continue;
    const c = d.children; // n, eq, sg, df, pn, vr, ic
    set(c[0], "t", l.pos); set(c[1], "bg", l.cor); set(c[2], "t", l.sigla); set(c[3], "t", l.dif.texto); set(c[3], "c", "df " + l.dif.tipo);
    set(c[4], "t", l.letra); set(c[4], "col", (F.PNEUS[l.pneu] || F.PNEUS.medio).cor); set(c[5], "d", l.volta ? "" : "none");
    const ic = l.dif.tipo === "out" ? "DNF" : l.noBox ? "BOX" : l.acabou ? "FIM" : l.penal > 0 ? `+${l.penal}s` : ""; // fora, no box, bandeirado ou punido
    set(c[6], "t", ic); set(c[6], "c", "ic" + (ic === "DNF" ? " dnf" : ic === "BOX" ? " box" : ic === "FIM" ? " fim" : ic ? " pen" : ""));
  }
  // o painel: velocidade, marcha, luzes de troca, BOOST (a carga do ERS) e o aviso de ultrapassagem (DRS)
  const lider = st[0], v = Math.abs(m ? race.car.v : (lider && race.ghosts.get(lider.id)?.v) || 0), kmh = Math.round(v * T.KMH_POR_U);
  const rpm = Math.min(1, race.rpm || 0), carga = Math.round((race.ers?.carga || 0) * 100);
  set($("pVel"), "t", kmh); set($("pMarcha"), "t", !m ? "" : race.marcha || 1);
  const luzes = $("pRpm").children, acesas = Math.round(rpm * N_RPM); for (let k = 0; k < N_RPM; k++) set(luzes[k], "c", k < acesas ? (k < N_RPM * 0.55 ? "g" : k < N_RPM * 0.8 ? "r" : "b") : "");
  set($("pBoost"), "w", carga + "%"); set($("pBoostT"), "t", carga + "%"); set($("pBoost"), "c", race.ersAtivo ? "on" : "");
  const aberto = !!race.drsAtivo, pronto = !!m && m.drsZona >= 0;
  set($("pOver"), "t", aberto ? "DRS" : "OVERTAKE"); set($("pOver"), "c", "pf-over" + (aberto ? " aberto" : pronto ? " pronto" : ""));
  const pn = race.pneu, dano = m ? Math.round(m.dano || 0) : 0;
  set($("hPainel").querySelector(".pf-extra"), "d", pn ? "" : "none");
  if (pn) {
    const tipo = F.PNEUS[pn.composto] || F.PNEUS[F.COMPOSTO_PADRAO], resta = F.vidaRestante(pn), el = $("pPneu");
    set(el, "c", "pf-pneu" + (pn.desgaste > F.PENHASCO ? " fim" : "") + (F.frio(pn) ? " frio" : "")); set(el, "style", `--c:${tipo.cor};--r:${Math.round(resta * 100)}`);
    set(el.children[0], "t", T.LETRA[pn.composto] || "M"); set(el.children[1], "t", Math.max(0, Math.round(resta * 100)) + "%"); // o que ainda resta: 100% novo, 0% no penhasco
    set($("pDanoT"), "t", `DANO ${dano}%`); set($("pDano"), "w", Math.min(100, dano) + "%"); set($("pDano"), "c", dano >= 66 ? "alto" : dano >= 33 ? "medio" : "");
  }
}
// ---------- as cinco luzes da largada (regras de F1) ----------
// Uma acende por segundo e as cinco apagam juntas depois da espera sorteada pelo servidor (`luzes.espera`): a largada
// é quando apagam. Mostra a fileira no alto da tela (a do pórtico fica lá longe, na frente do grid) e acende também o pórtico.
function luzesDaLargada(left) {
  const l = race.luzes, el = $("hLuzes"); if (!el) return;
  const n = !l || left <= 0 || left > l.espera + 4 ? 0 : Math.min(5, Math.floor(l.espera + 5 - left));
  el.classList.toggle("hidden", !l || left <= -1.2 || (race.tvAte > 0 && sNow() < race.tvAte)); // (durante a transmissão de TV as luzes não aparecem)
  if (race.luzN === n) return;
  if (n > race.luzN) Sound.beep(false);
  race.luzN = n; el.querySelectorAll("i").forEach((i, k) => i.classList.toggle("on", k < n)); if (race.tr.luzes) race.tr.luzes.set(n);
}
// ---------- a classificação (regras de F1) ----------
const tempo3 = (s) => (s == null ? "—" : `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, "0")}`);
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const pilotoNome = (p) => (p && (p.nomeCompleto || p.name)) || "?";
// o lugar no grid de quem foi eliminado na sessão `i` (quem passa tem `sessoes[i + 1]` carros): depois dos que seguem
const lugarDoEliminado = (q, i, id) => { const f = q.fechadas[i], passam = f.ordem.length - f.eliminados.length; return passam + f.eliminados.indexOf(id) + 1; };
function hudClassificacao(m, now) {
  const q = E.S.quali; if (!q) return;
  const tab = q.tabela, dentro = !!m && q.ativos.includes(m.id), pos = dentro ? tab.findIndex((x) => x.id === m.id) + 1 : 0, restante = Math.max(0, (q.fimAt - now) / 1000);
  const meu = m && tab.find((x) => x.id === m.id), pole = tab[0];
  $("hProg").textContent = q.nome; const frac = Math.max(0, Math.min(1, 1 - restante / Math.max(1, (q.fimAt - q.startAt) / 1000))); $("hBarra").style.width = Math.round(q.pausa ? 100 : frac * 100) + "%";
  $("hPos").innerHTML = dentro ? `${pos ? pos + "º" : "—"}<small>/${q.ativos.length}</small>` : "👀";
  $("hLap").textContent = q.pausa ? `${q.nome} encerrado` : now < q.startAt ? q.nome : restante > 0 ? `${q.nome} · ${mmss(restante)}` : `${q.nome} · bandeirada`;
  $("hTime").textContent = meu ? `melhor ${tempo3(meu.tempo)}` : dentro ? "sem tempo" : "";
  const el = $("hDelta"); el.textContent = meu && pole && pole.id !== m.id ? `+${(meu.tempo - pole.tempo).toFixed(3)} s da pole` : ""; el.className = "time num behind";
  const linhas = tab.slice(0, 8).map((x, i) => { const p = P(x.id); return `<div class="${m && x.id === m.id ? "eu" : ""}"><span>${i + 1}</span><i style="background:${p ? p.color : "#999"}"></i>${h(p ? p.name : "?")}<em>${tempo3(x.tempo)}</em></div>`; });
  if (meu && pos > 8) linhas.push(`<div class="eu"><span>${pos}</span><i style="background:${m.color}"></i>${h(m.name)} <em>${tempo3(meu.tempo)}</em></div>`);
  const quadro = linhas.join(""); if (race.hudQuadro !== quadro) { race.hudQuadro = quadro; $("hBoard").innerHTML = quadro; }
  const eliminado = m && !dentro ? q.fechadas.findIndex((f) => f.eliminados.includes(m.id)) : -1;
  let msg = "";
  if (q.pausa) msg = q.grid ? "🏁 Escolha o pneu e confirme a largada" : `🔴 ${q.nome} encerrado`;
  else if (eliminado >= 0) msg = `🔴 Eliminado no ${q.fechadas[eliminado].nome}: largará em ${lugarDoEliminado(q, eliminado, m.id)}º`;
  else if (dentro && now < q.startAt) msg = "⏱️ Classificação: faça a sua melhor volta lançada";
  else if (dentro && restante <= 0) msg = "🏁 Bandeirada: termine a volta";
  else if (dentro && !meu) msg = "⏱️ A volta conta na linha de chegada";
  if (E.S.config.regras === "f1") estadoF1(msg); else $("hMsg").textContent = msg;
  const bp = $("bPronto"); if (bp) { bp.classList.toggle("hidden", !dentro || q.pausa); bp.disabled = q.pronto.includes(m && m.id); }
}
// a tela entre as sessões: quem passou, quem caiu (em vermelho) e, no fim, o grid da largada
export function renderQuali() {
  const el = $("quali"), S = E.S, q = S && S.phase === "quali" && S.quali;
  if (!q || !q.pausa || !q.fechadas.length) { el.classList.add("hidden"); return; }
  const f = q.fechadas[q.fechadas.length - 1], ultima = !!q.grid, m = me();
  if (ultima && m && window.Radio) { const i = q.grid.indexOf(m.id); if (i >= 0) window.Radio.uma("quali:" + S.startAt, () => window.Radio.classificacao(i + 1, q.grid.length)); }
  const tempos = {}; for (const s of q.fechadas) for (const x of s.ordem) tempos[x.id] = x.tempo;
  const linhas = ultima ? q.grid.map((id) => ({ id, fora: false })) : f.ordem.map((x) => ({ id: x.id, fora: f.eliminados.includes(x.id) }));
  const pole = tempos[linhas[0].id], naUltima = new Set(f.ordem.map((x) => x.id)); // no grid final, só quem correu a última sessão tem diferença que se compara
  el.classList.remove("hidden");
  const confirmado = ultima && m && q.confirmados.includes(m.id);
  const prontos = ultima ? q.aguardados.filter((id) => q.confirmados.includes(id)).length : 0;
  const montagem = (ultima || q.nome === "Q2") && m && S.temporada && S.montagens && S.montagens[m.equipe];
  el.innerHTML = `<div class="placa gp"><div class="chk"></div><div class="in"><h2 style="font-size:26px;margin-bottom:6px">${ultima ? `🏁 Grid de largada · ${h(PISTAS[S.config.pista].name)}` : `⏱️ ${f.nome} encerrado`}</h2>
    <p class="muted" style="margin:0 0 8px">${ultima ? m ? confirmado ? `Largada confirmada. Aguardando os outros pilotos (${prontos}/${q.aguardados.length}).` : S.temporada ? "Ajuste os pontos do carro, escolha o pneu e confirme a largada." : "Escolha o pneu para começar a corrida e confirme a largada." : `Aguardando os pilotos confirmarem a largada (${prontos}/${q.aguardados.length}).` : `Os ${f.eliminados.length} mais lentos ficam por aqui e largam do fim do grid. Próxima sessão em instantes.${montagem ? " Você pode ajustar os pontos do carro abaixo." : ""}`}</p>
    ${ultima && S.previsao && window.PrevisaoUI ? `<div class="prev-bloco" style="margin:0 0 10px">${window.PrevisaoUI.html(S.previsao, { voltas: S.config.voltas })}</div>` : ""}
    ${ultima && m ? `<div class="pneus-largada" role="group" aria-label="Pneu da largada">${Object.entries(window.F1Regras.PNEUS).map(([id, pneu]) => `<button type="button" data-pneu-largada="${id}" class="${(m.pneu || "medio") === id ? "on" : ""}" ${confirmado ? "disabled" : ""}><i class="bola-pneu" style="--c:${pneu.cor}"></i>${pneu.nome}</button>`).join("")}</div>` : ""}
    ${montagem ? `<details class="acerto-grid" ${!confirmado ? "open" : ""}><summary>Acerto do carro · ${window.F1Equipes.custoDaMontagem(montagem)} pontos usados</summary>${window.F1Garagem.pontosHTML({ equipe: m.equipe, montagem, bonus: S.bonusMontagem[m.equipe] || 0, pode: !confirmado, motivo: "Largada já confirmada." })}</details>` : ""}
    ${ultima && m ? `<button type="button" id="confirmarLargada" class="confirmar-largada" ${confirmado ? "disabled" : ""}>${confirmado ? "✓ Largada confirmada" : "Confirmar largada"}</button>` : ""}
    <table class="qtab">${linhas.map((r, i) => { const p = P(r.id), t = tempos[r.id]; return `<tr class="${r.fora ? "fora" : ""} ${m && r.id === m.id ? "eu" : ""}"><td>${i + 1}</td><td><i class="faixa-eq" style="background:${p ? p.color : "#999"}"></i><b>${h(pilotoNome(p))}</b>${p && p.sigla ? ` <small class="muted">${h(p.sigla)}</small>` : ""}</td><td class="num">${t == null ? "sem tempo" : tempo3(t)}</td><td class="num muted">${t != null && i > 0 && pole != null && (!ultima || naUltima.has(r.id)) ? "+" + (t - pole).toFixed(3) : ""}</td></tr>`; }).join("")}</table></div></div>`;
  if (montagem && !confirmado) el.querySelectorAll("[data-ponto], [data-ponto-zerar]").forEach((botao) => { botao.onclick = () => {
      const nova = window.F1Garagem.cliquePonto(botao, montagem, m.equipe, S.bonusMontagem[m.equipe] || 0);
      if (nova) act("montagemGrid", { montagem: nova });
    }; });
  if (ultima && m && !confirmado) {
    el.querySelectorAll("[data-pneu-largada]").forEach((botao) => { botao.onclick = () => act("pneu", { pneu: botao.dataset.pneuLargada }); });
    el.querySelector("#confirmarLargada").onclick = () => act("confirmarLargada");
  }
}
// minimapa redondo que gira com o carro (a frente é para cima): a pista em cinza e o caminho à frente em azul-claro
function minimapa(st, m) {
  const cv = $("mini"), c = cv.getContext("2d"), S = cv.width, tr = race.tr, eu = m ? race.car : (st[0] && race.ghosts.get(st[0].id)) || race.car;
  const esc = S / 2 / 900, idx = m ? race.idx : eu.idx || 0;
  c.clearRect(0, 0, S, S); c.save();
  const fd = c.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S / 2); fd.addColorStop(0, "#1a2230ee"); fd.addColorStop(1, "#080b11ee");
  c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 3, 0, 7); c.fillStyle = fd; c.fill(); c.clip();
  c.translate(S / 2, S / 2 + S * 0.12); c.rotate(-eu.a - Math.PI / 2); c.scale(esc, esc); c.translate(-eu.x, -eu.y);
  c.lineCap = c.lineJoin = "round";
  c.beginPath(); for (let i = 0; i <= tr.n; i += 3) { const p = tr.pts[i % tr.n]; i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
  c.strokeStyle = "#8d97a6"; c.lineWidth = 34 / esc / 6; c.stroke();
  c.beginPath(); for (let k = 0; k <= 260; k += 2) { const p = tr.pts[(idx + k) % tr.n]; k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
  c.strokeStyle = "#5fe6ff"; c.lineWidth = 34 / esc / 6; c.stroke();
  for (const r of st) {
    if (m && r.id === m.id) continue; const gh = race.ghosts.get(r.id); if (!gh) continue;
    c.beginPath(); c.arc(gh.x, gh.y, 7 / esc / 1.4, 0, 7); c.fillStyle = r.p.color; c.fill(); c.lineWidth = 2.2 / esc; c.strokeStyle = "#fff"; c.stroke();
  }
  c.restore();
  // eu: a setinha no meio, e o "N" do norte girando na borda
  c.save(); c.translate(S / 2, S / 2 + S * 0.12); c.beginPath(); c.moveTo(0, -11); c.lineTo(8, 8); c.lineTo(0, 4); c.lineTo(-8, 8); c.closePath(); c.fillStyle = "#fff"; c.fill(); c.lineWidth = 2; c.strokeStyle = "#0b1016"; c.stroke(); c.restore();
  const na = -eu.a - Math.PI / 2 - Math.PI / 2, nr = S / 2 - 16;
  c.font = "800 15px Figtree, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff"; c.fillText("N", S / 2 + Math.cos(na) * nr, S / 2 + Math.sin(na) * nr);
  c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 3, 0, 7); c.lineWidth = 3; c.strokeStyle = "#ffffffcc"; c.stroke();
}
// velocímetro em arco: risquinhos, a faixa vermelha no fim, o arco aceso até a velocidade, a marcha e o número grande
function velocimetro(v) {
  if (race.hudF1) return; // nas regras de F1 quem mostra a velocidade é o painel (hudF1)
  const cv = $("velo"), c = cv.getContext("2d"), W = cv.width, H = cv.height, kmh = Math.round(v * 0.75);
  const marcha = race.marcha || 1, manual = E.S.config.cambio === "manual", pn = race.pneu;
  const dano = pn && me() ? Math.round(me().dano || 0) : 0;
  const chave = kmh + ":" + marcha + (pn ? ":" + pn.composto + Math.round(pn.desgaste * 100) + window.F1Regras.frio(pn) + ":" + dano : ""); if (race.hudVelo === chave) return; race.hudVelo = chave;
  const cx = W * 0.56, cy = H * 0.5, r = H * 0.4, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, max = 300, ang = (k) => a0 + (a1 - a0) * Math.min(1, k / max);
  c.clearRect(0, 0, W, H); c.lineCap = "round";
  c.beginPath(); c.arc(cx, cy, r, a0, a1); c.lineWidth = 3; c.strokeStyle = "#ffffff55"; c.stroke();
  c.beginPath(); c.arc(cx, cy, r, ang(250), a1); c.lineWidth = 6; c.strokeStyle = "#ff3d6e"; c.stroke();
  for (let k = 0; k <= max; k += 20) { const a = ang(k), big = k % 60 === 0; c.beginPath(); c.moveTo(cx + Math.cos(a) * (r - (big ? 14 : 8)), cy + Math.sin(a) * (r - (big ? 14 : 8))); c.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2)); c.lineWidth = big ? 3 : 1.5; c.strokeStyle = "#ffffffcc"; c.stroke(); }
  c.beginPath(); c.arc(cx, cy, r - 6, a0, ang(kmh)); c.lineWidth = 5; c.strokeStyle = kmh > 250 ? "#ff3d6e" : "#ffffff"; c.shadowColor = "#fff"; c.shadowBlur = 8; c.stroke(); c.shadowBlur = 0;
  // a marcha num círculo no meio do arco, e embaixo (no vão do arco) a velocidade grande e "KM/H"
  c.beginPath(); c.arc(cx, cy - 4, 17, 0, 7); c.fillStyle = "#0b1016aa"; c.fill(); c.lineWidth = 2; c.strokeStyle = "#ffffff99"; c.stroke();
  c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.font = "800 20px Figtree, sans-serif"; c.fillText(String(marcha), cx, cy - 3);
  if (manual) { c.font = "800 9px Figtree, sans-serif"; c.fillStyle = "#ffd23f"; c.fillText("MANUAL", cx, cy + 22); }
  { const rpm = Math.min(1, race.rpm || 0); for (let k = 0; k < 10; k++) { c.fillStyle = k / 10 < rpm ? (k < 6 ? "#2ecc71" : k < 8 ? "#ff3d6e" : "#5fc8ff") : "#ffffff22"; c.fillRect(cx - 50 + k * 10.4, cy - r - 12, 8, 5); } } // luzes de troca, como no volante do F1
  c.shadowColor = "#000a"; c.shadowBlur = 6;
  c.fillStyle = "#fff"; c.font = "500 58px Figtree, sans-serif"; c.textBaseline = "alphabetic"; c.fillText(String(kmh), cx, cy + r + 18);
  c.font = "800 12px Figtree, sans-serif"; c.fillStyle = "#ffffffcc"; c.textAlign = "left"; c.fillText("KM/H", cx + r * 0.78, cy + r + 16); c.shadowBlur = 0;
  if (pn) { pneuHud(c, pn, 30, H - 46); danoHud(c, dano, 6, H - 80); }
}
// a barra de dano do carro (regras de F1), em cima do pneu: enche de verde a vermelho conforme as batidas; em 100% é perda total
function danoHud(c, dano, x, y) {
  const w = 72, cor = dano >= 66 ? "#ff3d6e" : dano >= 33 ? "#ffb02e" : "#2ecc71";
  c.fillStyle = "#0b1016cc"; c.fillRect(x, y, w, 9);
  c.fillStyle = cor; c.fillRect(x, y, w * Math.min(1, dano / 100), 9);
  c.lineWidth = 1; c.strokeStyle = "#ffffff66"; c.strokeRect(x + 0.5, y + 0.5, w - 1, 8);
  c.fillStyle = "#fff"; c.textAlign = "left"; c.textBaseline = "bottom"; c.font = "800 9px Figtree, sans-serif"; c.fillText(`DANO ${dano}%`, x, y - 2);
}
// o dano de uma batida nova: aparece na hora, uma vez só
function avisoDeBatida(m) {
  const b = m && m.ultimaBatida;
  if (!b || race.batidaVista === b.at) return;
  race.batidaVista = b.at;
  if (sNow() - b.at > 4000) return; // uma batida velha, de antes de eu abrir a tela
  toast(`💥 Batida ${b.nivel === "media" ? "média" : b.nivel}: dano +${Math.round(b.dano)}%`, 2800);
}
// o pneu (regras de F1), à esquerda do velocímetro: o anel da cor do composto esvazia com o desgaste até 0% no penhasco (o fim
// da vida: dali o pneu despenca) e fica vermelho; com o pneu frio, o miolo fica azul. Embaixo, o nome do composto; no meio, quanto ainda resta.
function pneuHud(c, pn, x, y) {
  const F = window.F1Regras, tipo = F.PNEUS[pn.composto] || F.PNEUS[F.COMPOSTO_PADRAO], resta = F.vidaRestante(pn), r = 21;
  c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = F.frio(pn) ? "#1d5fa8dd" : "#0b1016cc"; c.fill();
  c.lineWidth = 6; c.beginPath(); c.arc(x, y, r - 4, 0, 7); c.strokeStyle = "#ffffff22"; c.stroke();
  c.beginPath(); c.arc(x, y, r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * resta); c.strokeStyle = pn.desgaste > F.PENHASCO ? "#ff3d6e" : tipo.cor; c.stroke();
  c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.font = "800 11px Figtree, sans-serif"; c.fillText(Math.round(resta * 100) + "%", x, y + 1);
  c.font = "800 10px Figtree, sans-serif"; c.fillStyle = "#ffffffcc"; c.fillText(tipo.nome.toUpperCase(), x, y + r + 11);
}
// volta nova: bipe e "última volta"
export function checkMyLap(old) {
  const m = me(), o = old && E.ME && old.players.find((p) => p.id === E.ME.id);
  if (!m || !o || !race) return;
  if (m.laps > o.laps) { lapDone(m); if (m.finish != null) Sound.finish(); else { Sound.lap(); race.lastLapMsg = sNow(); if (m.laps === E.S.config.voltas - 1 && E.S.config.voltas > 1) radioF1("ultima"); } }
}
// a tela do GP (regras de F1): o pódio, e a tabela com tempo ou diferença, grid, paradas, penalidades e os pontos oficiais
function resultadoGP(el, m, isHost) {
  { const R0 = E.S.resultado, meu = m && R0.find((r) => r.id === m.id); if (meu && window.Radio) window.Radio.uma("fim:" + E.S.startAt, () => window.Radio.fim(meu.pos, meu.pontos || 0, !!(meu.dnf || meu.nc))); }
  const S = E.S, R = S.resultado, F = window.F1Regras, vencedor = R[0], nome = (id) => pilotoNome(P(id));
  const pneus = (r) => (r.paradas ? `${r.paradas}P ` : "0P ") + (r.compostos || []).map((c) => `<u class="pn" style="--c:${F.PNEUS[c] ? F.PNEUS[c].cor : "#999"}"></u>`).join("");
  const final = (r) => r.dnf ? "DNF" : r.nc ? "NC" : r.tempo == null ? `+${Math.max(1, S.config.voltas - r.voltas)} volta${S.config.voltas - r.voltas > 1 ? "s" : ""}` : r === vencedor ? fmt(r.tempo) : `+${(r.tempo - vencedor.tempo).toFixed(3)} s`;
  const podio = [1, 0, 2].filter((i) => R[i]).map((i) => { const r = R[i], p = P(r.id); return `<div class="pod pod${i + 1}"><span class="pn-eq" style="background:${p ? p.color : "#999"}"></span><b>${h(nome(r.id))}</b><small>${h(p && p.equipe ? p.sigla : "")} ${r.tempo != null ? (r === vencedor ? fmt(r.tempo) : "+" + (r.tempo - vencedor.tempo).toFixed(3)) : ""}</small><div class="bloco">${i + 1}</div></div>`; }).join("");
  const punidos = S.players.filter((p) => (p.acrescimo || 0) > 0).length;
  el.classList.remove("hidden");
  el.innerHTML = `<div class="placa gp"><div class="chk"></div><div class="in"><div class="av-item av-fixo" style="--fundo:#f2f2f5;--txt:#0a0c12;--bloco:#0a0c12">${htmlAviso("chegada", punidos ? `Resultado do GP, com acréscimos de tempo para ${punidos} piloto${punidos > 1 ? "s" : ""}` : "Resultado oficial do GP")}</div><h2 style="font-size:26px;margin:10px 0 6px">🏆 GP · ${h(PISTAS[S.config.pista].name)}</h2>
    <div class="podio">${podio}</div>
    <table class="gptab"><thead><tr><th></th><th>Piloto</th><th class="num">Tempo</th><th>Grid</th><th>Paradas</th><th class="num">Melhor</th><th class="num">Pts</th></tr></thead><tbody>${R.map((r) => { const p = P(r.id), g = r.grid + 1, d = g - r.pos;
      return `<tr class="${m && r.id === m.id ? "eu" : ""} ${r.nc || r.dnf ? "nc" : ""}"><td>${r.nc || r.dnf ? "—" : r.pos + "º"}</td><td><i class="faixa-eq" style="background:${p ? p.color : "#999"}"></i><b>${h(nome(r.id))}</b>${p && p.sigla ? ` <small class="muted">${h(p.sigla)}</small>` : ""}</td><td class="num">${final(r)}${r.penal ? ` <small class="muted">(+${r.penal} s)</small>` : ""}${r.dano ? ` <small class="muted">· dano ${Math.round(r.dano)}%</small>` : ""}</td><td class="muted">${g}º ${d ? `<small class="${d > 0 ? "sobe" : "desce"}">${d > 0 ? "▲" : "▼"}${Math.abs(d)}</small>` : ""}</td><td class="muted">${pneus(r)}</td><td class="num muted">${r.melhor != null ? fmt(r.melhor) : ""}</td><td class="num"><b>${r.pontos || ""}</b></td></tr>`; }).join("")}</tbody></table>
    <div class="row" style="margin-top:14px;justify-content:center">${S.temporada ? `<button class="primary" id="rSede">← Voltar à sede</button>` : isHost ? `<button class="primary" id="rAgain">🏁 Novo GP</button><button id="rLobby">Trocar pista</button>` : `<span class="muted">Esperando o organizador…</span>`}${S.temporada ? "" : `<button class="ghost" onclick="location.href='/'">🏠 Vila</button>`}</div></div></div>`;
  if ($("rSede")) $("rSede").onclick = () => { location.href = "/corrida/temporada/" + (S.salaTemporada ? "?sala=" + S.salaTemporada : ""); };
  if ($("rAgain")) $("rAgain").onclick = () => act("start");
  if ($("rLobby")) $("rLobby").onclick = () => act("lobby");
}
export function renderResults() {
  const el = $("results");
  if (!E.S || E.S.phase !== "results") { el.classList.add("hidden"); return; }
  const m = me(), isHost = m && E.S.host === m.id, rows = standings();
  if (E.S.config.regras === "f1" && E.S.resultado) return resultadoGP(el, m, isHost);
  el.classList.remove("hidden");
  el.innerHTML = `<div class="placa"><div class="chk"></div><div class="in"><h2 style="font-size:28px;margin-bottom:10px">🏆 Resultado · ${h(PISTAS[E.S.config.pista].name)}</h2>
    <table>${rows.map((r, i) => `<tr><td>${r.done != null ? i + 1 + "º" : "—"}</td><td>${r.p.pawn} <b style="color:${r.p.color}">${h(r.p.name)}</b>${E.S.config.regras === "f1" ? ` <small class="muted">${h(r.p.pneuAtual || r.p.pneu)} · ${r.p.paradas}P</small>` : ""}</td><td class="num">${r.done != null ? fmt(r.done) : "não terminou"}${r.p.acrescimo ? ` <small class="muted">(+${r.p.acrescimo} s)</small>` : ""}</td><td class="num muted">${r.p.best != null ? "melhor " + fmt(r.p.best) : ""}</td></tr>`).join("")}</table>
    <div class="row" style="margin-top:14px;justify-content:center">${isHost ? `<button class="primary" id="rAgain">🏁 Correr de novo</button><button id="rLobby">Trocar pista</button>` : `<span class="muted">Esperando o organizador…</span>`}<button class="ghost" onclick="location.href='/'">🏠 Vila</button></div></div></div>`;
  if ($("rAgain")) $("rAgain").onclick = () => act("start");
  if ($("rLobby")) $("rLobby").onclick = () => act("lobby");
}
