// Corrida da Galera — o placar da corrida e o resultado.
import { E, PISTAS, $, h, sNow, me, P, act, fmt, SECTORS, checkpoint, toast } from "./estado.js";
import { Sound } from "./sons.js";
import { race } from "./jogo.js";
import { lapDone, deltaBest, myProg } from "./fantasma.js";
import { drawItemHud } from "./itens.js";

// ---------- placar da corrida ----------
export function standings() {
  if (!E.S || !race) return [];
  const rows = E.S.players.map((p) => {
    const gh = race.ghosts.get(p.id), prog = E.ME && p.id === E.ME.id ? myProg() : gh ? gh.prog : -1e9;
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
  else if (left > -1) { big = luz ? "" : "VAI!"; if (race.beeped !== 0) { race.beeped = 0; Sound.beep(true); } }
  luzesDaLargada(left);
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
  const quadro = st.slice(0, 8).map((r, i) => `<div class="${m && r.id === m.id ? "eu" : ""}"><span>${i + 1}</span><i style="background:${r.p.color}"></i>${h(r.p.name)}${r.p.bot ? " <em>CPU</em>" : ""}${pneuDe(r.p)}${r.done != null ? " 🏁" : ""}</div>`).join("");
  if (E.S.phase !== "quali" && race.hudQuadro !== quadro) { race.hudQuadro = quadro; $("hBoard").innerHTML = quadro; }
  if (m && race.hudChip !== m.name) { race.hudChip = m.name; $("hChip").innerHTML = `<i style="background:${m.color}"></i>${h(m.name)}<span>${h(PISTAS[cfg.pista].name)}</span>`; }
  // avisos
  let msg = "";
  const B = race.box, nomeBox = B && (B.fase ? B.composto : B.pedido) ? window.F1Regras.PNEUS[B.fase ? B.composto : B.pedido].nome : "";
  if (m && m.dnf) msg = "💥 PERDA TOTAL: o carro está destruído, você está fora";
  else if (B && B.fase) msg = B.fase === "entra" ? `🔧 BOX: limitador de velocidade` : B.fase === "parada" ? `🔧 ${window.F1Regras.textoDaParada(B.parada)} · trocando para o ${nomeBox} · ${Math.max(0, B.parada - B.t).toFixed(1)} s` : "🔧 BOX: saindo, pneu novo ainda frio";
  else if (E.S.direcao?.safety) msg = "🚨 SAFETY CAR: reduza e mantenha a posição";
  else if (E.S.direcao?.amarelo?.setor === Math.floor(race.idx / (tr.n / SECTORS))) msg = "🟡 BANDEIRA AMARELA: não ultrapasse";
  else if (B && B.pedido) msg = `🔧 BOX: ${nomeBox} (1, 2, 3 trocam · B cancela)`;
  else if (m && m.balaUntil > now) msg = "🚀 BALA! (piloto automático)";
  else if (m && m.spinUntil > now) msg = "💥 ATINGIDO!";
  else if (m && m.shrinkUntil > now) msg = "⚡ ENCOLHIDO PELO RAIO!";
  else if (race.wrong > 1) msg = "⚠️ CONTRAMÃO! (aperte ↺)";
  else if (race.perdeu >= 0 && m && m.finish == null) msg = "⟲ CHECKPOINT PERDIDO: volte nele ou aperte ↺";
  else if (race.cpT > now - 900 && race.sector > 0) msg = `✓ CHECKPOINT ${race.sector}/${SECTORS}`;
  else if (m && m.finish == null && m.started && m.laps === cfg.voltas - 1 && cfg.voltas > 1 && race.lastLapMsg > now - 2500) msg = "ÚLTIMA VOLTA!";
  else if (race.pneu && race.pneu.desgaste > window.F1Regras.PENHASCO && m && m.finish == null && m.started) msg = "PNEU NO FIM: segura nas curvas";
  else if (E.S.endAt && m && m.finish == null) msg = `⏱️ ${Math.max(0, Math.ceil((E.S.endAt - now) / 1000))} s para cruzar`;
  if (!msg && race.newRecord > now - 3000) msg = "🏆 NOVO RECORDE!";
  if (B) { const bt = $("bBox"), txt = B.pedido || B.fase ? `🔧 ${nomeBox}` : "🔧 Box"; if (bt.textContent !== txt) { bt.textContent = txt; bt.classList.toggle("pedido", !!(B.pedido || B.fase)); } }
  $("hMsg").textContent = msg;
  avisoDeBatida(m);
  if (E.S.phase === "quali") hudClassificacao(m, now);
  // vácuo e estilingue
  const dr = race.sling > 0 ? 1 : race.draft;
  const hd = $("hDraft");
  const star = m && m.starUntil > now;
  hd.innerHTML = star ? "⭐ ESTRELA!" : race.sling > 0 ? "🚀 ESTILINGUE!" : race.arSujo > 0.03 ? `🌀 AR SUJO<i style="width:${Math.round(race.draft * 100)}%"></i>` : race.draft > 0.15 ? `💨 VÁCUO<i style="width:${Math.round(race.draft * 100)}%"></i>` : race.catchup > 0.025 ? "⚡ PELOTÃO À VISTA" : "";
  hd.style.opacity = star || race.sling > 0 || race.draft > 0.15 || race.catchup > 0.025 ? 1 : 0;
  if ((race.hudVez = (race.hudVez || 0) + 1) % 2 === 0) minimapa(st, m); // o minimapa a cada 2 quadros já basta
}
// ---------- as cinco luzes da largada (regras de F1) ----------
// Uma acende por segundo e as cinco apagam juntas depois da espera sorteada pelo servidor (`luzes.espera`): a largada
// é quando apagam. Mostra a fileira no alto da tela (a do pórtico fica lá longe, na frente do grid) e acende também o pórtico.
function luzesDaLargada(left) {
  const l = race.luzes, el = $("hLuzes"); if (!el) return;
  const n = !l || left <= 0 || left > l.espera + 4 ? 0 : Math.min(5, Math.floor(l.espera + 5 - left));
  el.classList.toggle("hidden", !l || left <= -1.2);
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
  if (q.pausa) msg = q.grid ? "🏁 Grid definido: largada logo mais" : `🔴 ${q.nome} encerrado`;
  else if (eliminado >= 0) msg = `🔴 Eliminado no ${q.fechadas[eliminado].nome}: largará em ${lugarDoEliminado(q, eliminado, m.id)}º`;
  else if (dentro && now < q.startAt) msg = "⏱️ Classificação: faça a sua melhor volta lançada";
  else if (dentro && restante <= 0) msg = "🏁 Bandeirada: termine a volta";
  else if (dentro && !meu) msg = "⏱️ A volta conta na linha de chegada";
  $("hMsg").textContent = msg;
  const bp = $("bPronto"); if (bp) { bp.classList.toggle("hidden", !dentro || q.pausa); bp.disabled = q.pronto.includes(m && m.id); }
}
// a tela entre as sessões: quem passou, quem caiu (em vermelho) e, no fim, o grid da largada
export function renderQuali() {
  const el = $("quali"), S = E.S, q = S && S.phase === "quali" && S.quali;
  if (!q || !q.pausa || !q.fechadas.length) { el.classList.add("hidden"); return; }
  const f = q.fechadas[q.fechadas.length - 1], ultima = !!q.grid, m = me();
  const tempos = {}; for (const s of q.fechadas) for (const x of s.ordem) tempos[x.id] = x.tempo;
  const linhas = ultima ? q.grid.map((id) => ({ id, fora: false })) : f.ordem.map((x) => ({ id: x.id, fora: f.eliminados.includes(x.id) }));
  const pole = tempos[linhas[0].id], naUltima = new Set(f.ordem.map((x) => x.id)); // no grid final, só quem correu a última sessão tem diferença que se compara
  el.classList.remove("hidden");
  el.innerHTML = `<div class="placa gp"><div class="chk"></div><div class="in"><h2 style="font-size:26px;margin-bottom:6px">${ultima ? `🏁 Grid de largada · ${h(PISTAS[S.config.pista].name)}` : `⏱️ ${f.nome} encerrado`}</h2>
    <p class="muted" style="margin:0 0 8px">${ultima ? "A corrida começa logo mais, com as cinco luzes." : `Os ${f.eliminados.length} mais lentos ficam por aqui e largam do fim do grid. Próxima sessão em instantes.`}</p>
    <table class="qtab">${linhas.map((r, i) => { const p = P(r.id), t = tempos[r.id]; return `<tr class="${r.fora ? "fora" : ""} ${m && r.id === m.id ? "eu" : ""}"><td>${i + 1}</td><td><i class="faixa-eq" style="background:${p ? p.color : "#999"}"></i><b>${h(pilotoNome(p))}</b>${p && p.sigla ? ` <small class="muted">${h(p.sigla)}</small>` : ""}</td><td class="num">${t == null ? "sem tempo" : tempo3(t)}</td><td class="num muted">${t != null && i > 0 && pole != null && (!ultima || naUltima.has(r.id)) ? "+" + (t - pole).toFixed(3) : ""}</td></tr>`; }).join("")}</table></div></div>`;
}
// minimapa redondo que gira com o carro (a frente é para cima): a pista em cinza e o caminho à frente em azul-claro
function minimapa(st, m) {
  const cv = $("mini"), c = cv.getContext("2d"), S = cv.width, tr = race.tr, eu = m ? race.car : (st[0] && race.ghosts.get(st[0].id)) || race.car;
  const esc = S / 2 / 900, idx = m ? race.idx : eu.idx || 0;
  c.clearRect(0, 0, S, S); c.save();
  c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 3, 0, 7); c.fillStyle = "#0b1016cc"; c.fill(); c.clip();
  c.translate(S / 2, S / 2 + S * 0.12); c.rotate(-eu.a - Math.PI / 2); c.scale(esc, esc); c.translate(-eu.x, -eu.y);
  c.lineCap = c.lineJoin = "round";
  c.beginPath(); for (let i = 0; i <= tr.n; i += 3) { const p = tr.pts[i % tr.n]; i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
  c.strokeStyle = "#5d6673"; c.lineWidth = 34 / esc / 6; c.stroke();
  c.beginPath(); for (let k = 0; k <= 260; k += 2) { const p = tr.pts[(idx + k) % tr.n]; k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
  c.strokeStyle = "#5fe6ff"; c.lineWidth = 34 / esc / 6; c.stroke();
  for (const r of st) {
    if (m && r.id === m.id) continue; const gh = race.ghosts.get(r.id); if (!gh) continue;
    c.beginPath(); c.arc(gh.x, gh.y, 7 / esc / 1.4, 0, 7); c.fillStyle = r.p.color; c.fill(); c.lineWidth = 2 / esc; c.strokeStyle = "#000"; c.stroke();
  }
  c.restore();
  // eu: a setinha no meio, e o "N" do norte girando na borda
  c.save(); c.translate(S / 2, S / 2 + S * 0.12); c.beginPath(); c.moveTo(0, -11); c.lineTo(8, 8); c.lineTo(0, 4); c.lineTo(-8, 8); c.closePath(); c.fillStyle = "#fff"; c.fill(); c.lineWidth = 2; c.strokeStyle = "#0b1016"; c.stroke(); c.restore();
  const na = -eu.a - Math.PI / 2 - Math.PI / 2, nr = S / 2 - 16;
  c.font = "800 15px Figtree, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff"; c.fillText("N", S / 2 + Math.cos(na) * nr, S / 2 + Math.sin(na) * nr);
  c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 3, 0, 7); c.lineWidth = 3; c.strokeStyle = "#ffffff55"; c.stroke();
}
// velocímetro em arco: risquinhos, a faixa vermelha no fim, o arco aceso até a velocidade, a marcha e o número grande
function velocimetro(v) {
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
// a punição de uma batida nova (a mesma que o servidor somou ao tempo): aparece na hora, uma vez só
function avisoDeBatida(m) {
  const b = m && m.ultimaBatida;
  if (!b || race.batidaVista === b.at) return;
  race.batidaVista = b.at;
  if (sNow() - b.at > 4000) return; // uma batida velha, de antes de eu abrir a tela
  toast(`💥 Batida ${b.nivel === "media" ? "média" : b.nivel}: +${b.segundos} s · dano +${Math.round(b.dano)}%`, 2800);
}
// o pneu (regras de F1), à esquerda do velocímetro: o anel da cor do composto esvazia com o desgaste e fica vermelho
// depois do penhasco; com o pneu frio, o miolo fica azul. Embaixo, o nome do composto; no meio, quanto ainda resta.
function pneuHud(c, pn, x, y) {
  const F = window.F1Regras, tipo = F.PNEUS[pn.composto] || F.PNEUS[F.COMPOSTO_PADRAO], resta = Math.max(0, 1 - pn.desgaste), r = 21;
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
  if (m.laps > o.laps) { lapDone(m); if (m.finish != null) Sound.finish(); else { Sound.lap(); race.lastLapMsg = sNow(); } }
}
// a tela do GP (regras de F1): o pódio, e a tabela com tempo ou diferença, grid, paradas, penalidades e os pontos oficiais
function resultadoGP(el, m, isHost) {
  const S = E.S, R = S.resultado, F = window.F1Regras, vencedor = R[0], nome = (id) => pilotoNome(P(id));
  const pneus = (r) => (r.paradas ? `${r.paradas}P ` : "0P ") + (r.compostos || []).map((c) => `<u class="pn" style="--c:${F.PNEUS[c] ? F.PNEUS[c].cor : "#999"}"></u>`).join("");
  const final = (r) => r.dnf ? "DNF" : r.nc ? "NC" : r.tempo == null ? `+${Math.max(1, S.config.voltas - r.voltas)} volta${S.config.voltas - r.voltas > 1 ? "s" : ""}` : r === vencedor ? fmt(r.tempo) : `+${(r.tempo - vencedor.tempo).toFixed(3)} s`;
  const podio = [1, 0, 2].filter((i) => R[i]).map((i) => { const r = R[i], p = P(r.id); return `<div class="pod pod${i + 1}"><span class="pn-eq" style="background:${p ? p.color : "#999"}"></span><b>${h(nome(r.id))}</b><small>${h(p && p.equipe ? p.sigla : "")} ${r.tempo != null ? (r === vencedor ? fmt(r.tempo) : "+" + (r.tempo - vencedor.tempo).toFixed(3)) : ""}</small><div class="bloco">${i + 1}</div></div>`; }).join("");
  el.classList.remove("hidden");
  el.innerHTML = `<div class="placa gp"><div class="chk"></div><div class="in"><h2 style="font-size:26px;margin-bottom:6px">🏆 GP · ${h(PISTAS[S.config.pista].name)}</h2>
    <div class="podio">${podio}</div>
    <table class="gptab"><thead><tr><th></th><th>Piloto</th><th class="num">Tempo</th><th>Grid</th><th>Paradas</th><th class="num">Melhor</th><th class="num">Pts</th></tr></thead><tbody>${R.map((r) => { const p = P(r.id), g = r.grid + 1, d = g - r.pos;
      return `<tr class="${m && r.id === m.id ? "eu" : ""} ${r.nc || r.dnf ? "nc" : ""}"><td>${r.nc || r.dnf ? "—" : r.pos + "º"}</td><td><i class="faixa-eq" style="background:${p ? p.color : "#999"}"></i><b>${h(nome(r.id))}</b>${p && p.sigla ? ` <small class="muted">${h(p.sigla)}</small>` : ""}</td><td class="num">${final(r)}${r.penal ? ` <small class="muted">(+${r.penal} s)</small>` : ""}${r.dano ? ` <small class="muted">· dano ${Math.round(r.dano)}%</small>` : ""}</td><td class="muted">${g}º ${d ? `<small class="${d > 0 ? "sobe" : "desce"}">${d > 0 ? "▲" : "▼"}${Math.abs(d)}</small>` : ""}</td><td class="muted">${pneus(r)}</td><td class="num muted">${r.melhor != null ? fmt(r.melhor) : ""}</td><td class="num"><b>${r.pontos || ""}</b></td></tr>`; }).join("")}</tbody></table>
    <div class="row" style="margin-top:14px;justify-content:center">${isHost ? `<button class="primary" id="rAgain">🏁 Novo GP</button><button id="rLobby">Trocar pista</button>` : `<span class="muted">Esperando o organizador…</span>`}<button class="ghost" onclick="location.href='/'">🏠 Vila</button></div></div></div>`;
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
