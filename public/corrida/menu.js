// Corrida da Galera — a tela inicial (/corrida/): a garagem 3D de fundo, o menu à esquerda (Carreira, Corrida rápida, Multiplayer,
// Contrarrelógio, Garagem e Drag), os painéis de cada modo à direita e os três cartões embaixo. O carro é o da equipe escolhida na Garagem (ou a da
// carreira). Os números vêm do servidor: o save da carreira pelo canal /corrida-temporada e o resto por GET /api/corrida/menu.
// Teclado e controle: setas ou direcional movem o foco, Enter ou A confirmam, Esc ou B voltam (e, sem nada aberto, levam à Vila).
import { E, socket, PISTAS, $, h, store } from "./estado.js";
import { loadBest } from "./fantasma.js";
import { enter } from "./rede.js";

const fmt = (s) => (s == null ? "—" : `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, "0")}`); // o tempo de volta com os milésimos
const CHAVE_EQUIPE = "corrida:menu:equipe", CHAVE_RAPIDA = "corrida:menu:rapida", CHAVE_CONTRA = "corrida:menu:contra";
const FP = () => window.F1Pilotos, G = () => window.GpInfo, ehCelular = () => innerWidth < 860;
const lerStore = (k, padrao) => { try { return { ...padrao, ...(store.get(k) || {}) }; } catch { return { ...padrao }; } };
const seta = '<i class="mn-seta" aria-hidden="true"></i>';

let garagem = null, naTela = false, resumoMenu = null, carreira = null, grupos = [], timerResumo = 0, timerPad = 0, painel = null, modGaragem = null, focoAntes = null, recordes = null;
const rapida = lerStore(CHAVE_RAPIDA, { pista: "monaco", voltas: 3, nivel: "medio", clima: "aleatorio", classificacao: "pular" });
const contra = lerStore(CHAVE_CONTRA, { pista: "monaco", voltas: 3 });
const equipeEscolhida = () => { const e = store.get(CHAVE_EQUIPE); return e && FP()?.EQUIPES[e] ? e : null; };
const equipeDoCarro = () => equipeEscolhida() || carreira?.dados?.equipe || "ferrari";
const nomePiloto = () => ($("hName")?.value || store.get("galera:name") || "").trim();

// ---------- a entrada e a saída da tela ----------
export function menuNaTela(sim) {
  if (sim === naTela) return; naTela = sim;
  if (!sim) { fecharAjustes(); clearInterval(timerResumo); clearInterval(timerPad); garagem?.parar(); garagem = null; return; } // a corrida precisa da GPU inteira
  ligarUmaVez();
  $("mnNomeTopo").textContent = nomePiloto() || "Piloto";
  $("hName").value = nomePiloto();
  ligarGaragem(); carregarCarreira(); carregarGrupos(); pedirResumo(); desenharCartoes();
  timerResumo = setInterval(pedirResumo, 15000); timerPad = setInterval(lerControle, 90);
  if (!painel) requestAnimationFrame(() => { if (!document.activeElement || document.activeElement === document.body) itensDoMenu()[0]?.focus({ preventScroll: true }); });
}
async function ligarGaragem() {
  try {
    modGaragem ||= await import("/corrida/garagem3d.js");
    if (!naTela || garagem) return;
    $("mn").classList.add("carro-vindo");
    let carroPronto = false;
    garagem = modGaragem.criarGaragem($("mnPalco"), {
      aoCarregar: () => { carroPronto = true; $("mn").classList.remove("carro-vindo"); },
      aoDesenhar: () => { if (carroPronto) window.preparoPronto?.(); }
    });
    if (!garagem) { $("mn").classList.add("sem3d"); window.preparoPronto?.(); return; }
    garagem.vista(ehCelular() ? "celular" : painel ? "painel" : "menu", true); garagem.trocarEquipe(equipeDoCarro());
  } catch (e) { console.warn("garagem 3D indisponível", e); $("mn").classList.add("sem3d"); window.preparoPronto?.(); }
}
addEventListener("resize", () => { if (garagem) garagem.vista(ehCelular() ? "celular" : painel ? "painel" : "menu"); }, { passive: true });

// ---------- os dados: o save da carreira, as salas em grupo guardadas e o resumo do servidor ----------
function carregarCarreira() {
  let token = null; try { token = localStorage.getItem("corrida:temporada:token"); } catch {}
  if (!token) { carreira = null; return desenharCarreira(); }
  const canal = window.io("/corrida-temporada");
  canal.emit("abrir", { token }, (r) => {
    canal.disconnect(); carreira = r?.ok && r.dados ? r : null; desenharCarreira();
    if (naTela && garagem && !equipeEscolhida()) garagem.trocarEquipe(equipeDoCarro());
    desenharSecao("garagem");
  });
}
function carregarGrupos() {
  grupos = [];
  try { for (let i = 0; i < localStorage.length; i++) { const m = /^corrida:temporada:grupo:([A-Z0-9]+)$/.exec(localStorage.key(i) || ""); if (m) grupos.push(m[1]); } } catch {}
  $("mnGrupos").innerHTML = grupos.length ? `<div class="mn-campo"><span class="mn-rot">Suas temporadas em grupo</span>${grupos.map((c) => `<a class="mn-sala" href="/corrida/temporada/?sala=${h(c)}"><b>${h(c)}</b><span>Voltar à temporada</span>${seta}</a>`).join("")}</div>` : "";
}
async function pedirResumo() {
  try { const r = await fetch("/api/corrida/menu"); if (!r.ok) return; resumoMenu = await r.json(); } catch { return; }
  if (!naTela) return;
  const n = resumoMenu.online, s = resumoMenu.salas.length;
  $("mnOnline").innerHTML = `<i></i>Online<em>${n} ${n === 1 ? "piloto" : "pilotos"} · ${s} ${s === 1 ? "sala aberta" : "salas abertas"}</em>`;
  desenharSalas(); desenharCartoes();
}
function desenharSalas() {
  const lista = resumoMenu?.salas || [], alvo = $("mnSalas"); if (!alvo) return;
  const html = lista.length ? lista.map((s) => `<button type="button" class="mn-sala" data-entrar="${h(s.code)}"><b>${h(s.code)}</b><span>Sala de ${h(s.dono)} · ${s.jogadores}/${s.max}</span>${seta}</button>`).join("") : '<p class="mn-vazio">Nenhuma sala aberta agora. Abra a sua e chame a galera.</p>';
  if (alvo._h !== html) { alvo._h = html; alvo.innerHTML = html; }
}

// ---------- o item da carreira e os três cartões ----------
const posTxt = (n) => `${n}º`;
function desenharCarreira() {
  const s = carreira?.dados, t = carreira?.tabelas;
  $("mnCarreiraT").textContent = s ? "Continuar carreira" : "Nova carreira";
  if (!s) $("mnCarreiraS").textContent = "Escolha a equipe e dispute a temporada";
  else if (s.gp >= s.tamanho) $("mnCarreiraS").textContent = `Temporada ${s.ano} encerrada`;
  else $("mnCarreiraS").textContent = `${carreira.ativo ? "GP em andamento" : "Próxima etapa"}: ${gpCurto(s.calendario[s.gp])}`;
  desenharCartoes();
  void t;
}
const gpCurto = (e) => (e ? `GP ${/^[AEIOU]/i.test(e.nome) ? "da" : "de"} ${e.nome}` : "");
function cartaoGP(id, rot, titulo, sub, el) {
  const foto = G()?.fundoDe(id), traco = window.GpSobre ? window.GpSobre.mapaSvg(id, "mn-traco") : "";
  el.style.setProperty("--foto", foto ? `url("${foto}")` : "none");
  el.innerHTML = `<span class="mn-c-foto" aria-hidden="true"></span><span class="mn-c-txt"><small>${h(rot)}</small><b>${h(titulo)}</b><span>${h(sub)}</span></span><span class="mn-c-marca">${traco}</span>`;
}
function desenharCartoes() {
  const s = carreira?.dados, t = carreira?.tabelas, c1 = $("mnC1"), c2 = $("mnC2"), c3 = $("mnC3");
  if (s && t) {
    const eu = t.pilotos.findIndex((p) => p.id === "voce"), pts = t.pilotos[eu]?.pontos || 0;
    c1.innerHTML = `<span class="mn-c-txt"><small>Sua temporada</small><b>${s.gp ? `${posTxt(eu + 1)} no campeonato` : "Tudo por fazer"}</b><span>${pts} ${pts === 1 ? "ponto" : "pontos"}</span></span><span class="mn-c-marca">${LOUROS}</span>`;
  } else c1.innerHTML = `<span class="mn-c-txt"><small>Sua temporada</small><b>Comece a carreira</b><span>11 equipes · grid de 22 carros</span></span><span class="mn-c-marca">${LOUROS}</span>`;
  if (s && s.gp < s.tamanho) { const e = s.calendario[s.gp]; c2.href = "/corrida/temporada/"; c2.removeAttribute("data-painel"); cartaoGP(e.pista, "Próxima etapa", e.nome, `Rodada ${String(s.gp + 1).padStart(2, "0")} / ${String(s.tamanho).padStart(2, "0")}`, c2); }
  else { const id = rapida.pista; c2.href = "#rapida"; c2.dataset.painel = "rapida"; cartaoGP(id, "Corrida rápida", PISTAS[id]?.name || id, `${rapida.voltas} ${rapida.voltas === 1 ? "volta" : "voltas"} · direto para a pista`, c2); }
  const d = resumoMenu?.desafio;
  if (d && PISTAS[d.pista]) {
    const meu = loadBest(d.pista);
    c3.innerHTML = `<span class="mn-c-txt"><small>Desafio semanal · ${h(d.nome)}</small><b>Volta perfeita</b><span>${meu ? `Seu melhor: ${h(fmt(meu.t))}` : d.recorde ? `Recorde: ${h(fmt(d.recorde.tempo))} · ${h(d.recorde.piloto)}` : "Supere seu melhor tempo"}</span></span><span class="mn-c-marca">${CRONO}</span>`;
    c3.dataset.pista = d.pista;
  } else c3.innerHTML = `<span class="mn-c-txt"><small>Desafio semanal</small><b>Volta perfeita</b><span>Supere seu melhor tempo</span></span><span class="mn-c-marca">${CRONO}</span>`;
}
const LOUROS = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M32 56C18 52 9 42 9 26M32 56c14-4 23-14 23-30"/><path d="M9 26c-3-4-3-8-1-12 3 3 4 8 1 12ZM12 37c-5-2-7-6-7-11 4 2 7 6 7 11ZM18 46c-5 0-9-3-11-7 5-1 9 2 11 7ZM27 53c-5 2-9 0-13-3 5-2 10-1 13 3ZM55 26c3-4 3-8 1-12-3 3-4 8-1 12ZM52 37c5-2 7-6 7-11-4 2-7 6-7 11ZM46 46c5 0 9-3 11-7-5-1-9 2-11 7ZM37 53c5 2 9 0 13-3-5-2-10-1-13 3Z" fill="currentColor" stroke="none"/></svg>';
const CRONO = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><circle cx="32" cy="36" r="21"/><path d="M26 6h12M32 6v9M50 17l4 4M32 24v12l8 6"/></svg>';

// ---------- os painéis ----------
const TITULO = { rapida: "Corrida rápida", contra: "Contrarrelógio", multi: "Multiplayer", garagem: "Garagem" };
function abrirPainel(nome, focar) {
  if (painel === nome) return fecharPainel();
  if (!painel) focoAntes = document.activeElement;
  painel = nome; $("mn").dataset.painel = nome; $("mnPainel").classList.remove("hidden"); $("mnPainelT").textContent = TITULO[nome];
  document.querySelectorAll(".mn-sec").forEach((s) => s.classList.toggle("on", s.dataset.sec === nome));
  document.querySelectorAll("#mnMenu [data-painel]").forEach((b) => { const on = b.dataset.painel === nome; b.classList.toggle("aberto", on); b.setAttribute("aria-expanded", on); });
  $("hErr").textContent = "";
  const p = $("mnPainel"); p.classList.remove("entra"); void p.offsetWidth; p.classList.add("entra");
  desenharSecao(nome);
  if (!ehCelular()) garagem?.vista("painel");
  if (focar !== false) requestAnimationFrame(() => (focar || p.querySelector(`.mn-sec.on button:not(:disabled), .mn-sec.on input, .mn-sec.on a`))?.focus({ preventScroll: true }));
  if (ehCelular()) p.scrollIntoView({ block: "start", behavior: "smooth" });
}
function fecharPainel() {
  if (!painel) return; const de = document.querySelector(`#mnMenu [data-painel="${painel}"]`);
  painel = null; delete $("mn").dataset.painel; $("mnPainel").classList.add("hidden");
  document.querySelectorAll("#mnMenu [data-painel]").forEach((b) => { b.classList.remove("aberto"); b.removeAttribute("aria-expanded"); });
  if (!ehCelular()) garagem?.vista("menu");
  (de || focoAntes)?.focus({ preventScroll: true });
}
const seg = (itens, atual, attr, rot) => `<div class="mn-campo"><span class="mn-rot">${rot}</span><div class="mn-seg" role="group" aria-label="${rot}">${itens.map(([v, l]) => `<button type="button" class="${String(atual) === String(v) ? "on" : ""}" data-${attr}="${v}" aria-pressed="${String(atual) === String(v)}">${l}</button>`).join("")}</div></div>`;
const idsPistas = () => Object.keys(PISTAS);
function carrossel(id, attr, extra = "") {
  const t = PISTAS[id], foto = G()?.fundoDe(id), info = G()?.get(id), traco = window.GpSobre ? window.GpSobre.mapaSvg(id, "mn-traco") : "";
  return `<div class="mn-pista" style="--foto:${foto ? `url('${foto}')` : "none"}"><button type="button" class="mn-pista-nav" data-${attr}-nav="-1" aria-label="Pista anterior">‹</button>
    <div class="mn-pista-meio"><span class="mn-pista-traco">${traco}</span><b>${h(t.name)}</b><small>${info?.real ? `${h(info.cidade)} · ${h(info.pais)}` : "Pista da galera"}${extra}</small></div>
    <button type="button" class="mn-pista-nav" data-${attr}-nav="1" aria-label="Próxima pista">›</button></div>`;
}
function desenharSecao(nome) {
  if (nome === "rapida") {
    $("mnRapida").innerHTML = carrossel(rapida.pista, "rp")
      + seg([[1, "1"], [3, "3"], [5, "5"], [10, "10"]], rapida.voltas, "rp-voltas", "Voltas")
      + seg([["facil", "Fácil"], ["medio", "Médio"], ["dificil", "Difícil"]], rapida.nivel, "rp-nivel", "Robôs · grid de 22")
      + seg([["aleatorio", "Aleatório"], ["seco", "Seco"], ["chuva", "Chuva"], ["variavel", "Variável"]], rapida.clima, "rp-clima", "Clima")
      + seg([["pular", "Direto"], ["completa", "Com classificação"]], rapida.classificacao, "rp-quali", "Fim de semana")
      + `<button type="button" class="mn-acao" id="mnLargar"><span><b>Largar</b><small>${h(equipeNome())} · pneu médio</small></span>${seta}</button><button type="button" class="mn-link" id="mnAjustar">Abrir a sala para ajustar tudo</button>`;
  } else if (nome === "contra") {
    const desafio = resumoMenu?.desafio?.pista === contra.pista, meu = loadBest(contra.pista), rec = recordes?.[contra.pista]?.[0];
    if (!recordes) carregarRecordes();
    $("mnContra").innerHTML = carrossel(contra.pista, "ct", desafio ? ' · <em>Desafio da semana</em>' : "")
      + seg([[1, "1"], [3, "3"], [5, "5"]], contra.voltas, "ct-voltas", "Voltas")
      + `<div class="mn-tempos"><div><small>Seu melhor</small><b>${meu ? h(fmt(meu.t)) : "—"}</b></div><div><small>Recorde da pista</small><b>${rec ? h(fmt(rec.tempo)) : "—"}</b><span>${rec ? h(rec.piloto) : ""}</span></div></div>`
      + `<p class="mn-nota">Sozinho na pista, pista seca, pneu macio. O fantasma da sua melhor volta corre junto.</p>`
      + `<button type="button" class="mn-acao" id="mnContraLargar"><span><b>Para a pista</b><small>${h(equipeNome())}</small></span>${seta}</button>`;
  } else if (nome === "multi") desenharSalas();
  else if (nome === "garagem") desenharGaragem();
}
const equipeNome = () => FP()?.EQUIPES[equipeDoCarro()]?.nome || "Sua equipe";
async function carregarRecordes() {
  try { const r = await (await fetch("/api/recordes-corrida")).json(); recordes = Object.fromEntries((r.pistas || []).map((p) => [p.id, p.top])); if (painel === "contra") desenharSecao("contra"); } catch { recordes = {}; }
}
function desenharGaragem() {
  const atual = equipeDoCarro(), E = FP()?.EQUIPES || {}, Eq = window.F1Equipes;
  const alvo = $("mnEquipes"), html = Object.entries(E).map(([id, e]) => `<button type="button" class="mn-eq ${id === atual ? "on" : ""}" style="--c:${h(e.cor)}" data-equipe-menu="${h(id)}" aria-pressed="${id === atual}" title="${h(e.nome)}"><img src="/api/corrida/logo/${encodeURIComponent(id)}" alt="" loading="eager" onerror="this.style.display='none'"><span>${h(e.sigla)}</span></button>`).join("");
  if (alvo._h !== html) { alvo._h = html; alvo.innerHTML = html; }
  const e = E[atual], q = Eq?.EQUIPES[atual], pil = (FP()?.PILOTOS || []).filter((p) => p.equipe === atual).map((p) => p.nome);
  const ficha = Eq ? Eq.ficha(Eq.specDaEquipe(atual)) : [];
  $("mnFicha").style.setProperty("--c", e?.cor || "#e10600");
  $("mnFicha").innerHTML = `<header><b>${h(e?.nome || "")}</b>${q ? `<span>${q.orcamento} pts de orçamento</span>` : ""}</header>${pil.length ? `<p>${pil.map(h).join(" · ")}</p>` : ""}<ul>${ficha.map((f) => `<li><span>${h(f.rotulo)}</span><i><u style="width:${f.nota * 10}%"></u></i><b>${f.nota}</b></li>`).join("")}</ul>`;
  $("mnGaragemCarreira").textContent = carreira?.dados ? "Peças e desenvolvimento: abrir a carreira" : "Peças e desenvolvimento ficam na carreira";
}

// ---------- largar direto ----------
function exigirNome() {
  const n = nomePiloto(); if (n) { store.set("galera:name", n); return n; }
  $("hErr").textContent = "Coloque o seu nome."; $("hName").focus(); return null;
}
let criandoSala = false;
function criar(config, inicio) {
  if (criandoSala) return;
  const name = exigirNome(); if (!name) return;
  $("hErr").textContent = "";
  criandoSala = true;
  E.entradaDireta = inicio?.largar === true;
  socket.emit("create", { name, skin: store.get("galera:skin"), config, inicio }, (r) => {
    criandoSala = false;
    if (r?.ok) enter(r);
    else { E.entradaDireta = false; $("hErr").textContent = r?.error || "Não foi possível criar a sala. Tente novamente."; }
  });
}
const configRapida = () => ({ pista: rapida.pista, regras: "f1", voltas: rapida.voltas, nivel: rapida.nivel, robos: 21, clima: rapida.clima, classificacao: rapida.classificacao });
function largarRapida(largar) { store.set(CHAVE_RAPIDA, rapida); criar(configRapida(), { equipe: equipeDoCarro(), largar }); }
function largarContra() { store.set(CHAVE_CONTRA, contra); criar({ pista: contra.pista, regras: "f1", voltas: contra.voltas, robos: 0, clima: "seco", classificacao: "pular", contrarrelogio: true }, { equipe: equipeDoCarro(), pneu: "macio", largar: true }); }
function andarPista(cfg, d) { const l = idsPistas(), i = l.indexOf(cfg.pista); cfg.pista = l[(i + d + l.length) % l.length]; }

// ---------- os cliques ----------
function aoClicar(e) {
  const b = e.target.closest("button,a"); if (!b) return;
  const d = b.dataset;
  if (b.closest("#mnMenu") && d.painel) { e.preventDefault(); return abrirPainel(d.painel); }
  if (b.id === "mnC2" && d.painel) { e.preventDefault(); return abrirPainel("rapida"); }
  if (b.id === "mnC3") { if (d.pista) contra.pista = d.pista; return abrirPainel("contra"); }
  if (b.id === "mnPainelX") return fecharPainel();
  if (b.id === "mnPerfil") { abrirPainel("garagem", $("hName")); return; }
  if (b.id === "mnAjustes") return alternarAjustes();
  if (d.entrar) { $("hCode").value = d.entrar; return $("btnJoin").click(); }
  if (d.equipeMenu) { store.set(CHAVE_EQUIPE, d.equipeMenu); garagem?.trocarEquipe(d.equipeMenu); desenharGaragem(); return; }
  if (d.rpNav) { andarPista(rapida, +d.rpNav); store.set(CHAVE_RAPIDA, rapida); desenharSecao("rapida"); desenharCartoes(); return refocar(`[data-rp-nav="${d.rpNav}"]`); }
  if (d.ctNav) { andarPista(contra, +d.ctNav); store.set(CHAVE_CONTRA, contra); desenharSecao("contra"); return refocar(`[data-ct-nav="${d.ctNav}"]`); }
  const mudar = (cfg, campo, valor, attr, sec) => { cfg[campo] = valor; store.set(sec === "rapida" ? CHAVE_RAPIDA : CHAVE_CONTRA, cfg); desenharSecao(sec); desenharCartoes(); refocar(`[data-${attr}="${valor}"]`); };
  if (d.rpVoltas) return mudar(rapida, "voltas", +d.rpVoltas, "rp-voltas", "rapida");
  if (d.rpNivel) return mudar(rapida, "nivel", d.rpNivel, "rp-nivel", "rapida");
  if (d.rpClima) return mudar(rapida, "clima", d.rpClima, "rp-clima", "rapida");
  if (d.rpQuali) return mudar(rapida, "classificacao", d.rpQuali, "rp-quali", "rapida");
  if (d.ctVoltas) return mudar(contra, "voltas", +d.ctVoltas, "ct-voltas", "contra");
  if (b.id === "mnLargar") return largarRapida(true);
  if (b.id === "mnAjustar") return largarRapida(false);
  if (b.id === "mnContraLargar") return largarContra();
}
const refocar = (sel) => requestAnimationFrame(() => document.querySelector(`#mnPainel ${sel}`)?.focus({ preventScroll: true }));
function alternarAjustes() { const on = document.body.classList.toggle("mn-ajustes"); $("mnAjustes").setAttribute("aria-expanded", on); }
function fecharAjustes() { document.body.classList.remove("mn-ajustes"); $("mnAjustes")?.setAttribute("aria-expanded", "false"); }

// ---------- o brilho que segue o mouse nos cartões e nos itens ----------
function aoMoverBrilho(e) {
  const c = e.target.closest?.(".mn-cartao,.mn-item,.mn-acao,.mn-sala,.mn-eq"); if (!c) return;
  const r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${e.clientX - r.left}px`); c.style.setProperty("--my", `${e.clientY - r.top}px`);
  if (c.classList.contains("mn-cartao")) { c.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -5}deg`); c.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 5}deg`); }
}

// ---------- teclado e controle ----------
const itensDoMenu = () => [...document.querySelectorAll("#mnMenu .mn-item")];
const cartoes = () => [...document.querySelectorAll("#mnCartoes .mn-cartao")];
const focaveis = (raiz) => [...raiz.querySelectorAll("button:not(:disabled),a[href],input,select")].filter((x) => x.offsetParent !== null);
function mover(tecla) {
  const f = document.activeElement, emTexto = f && f.tagName === "INPUT";
  if (emTexto && (tecla === "ArrowLeft" || tecla === "ArrowRight")) return false;
  const d = tecla === "ArrowDown" || tecla === "ArrowRight" ? 1 : -1;
  if (f?.closest("#mnPainel")) {
    const l = focaveis($("mnPainel")), i = l.indexOf(f);
    if (tecla === "ArrowLeft" && !f.closest(".mn-seg,.mn-equipes,.mn-pista")) { const de = document.querySelector(`#mnMenu [data-painel="${painel}"]`); de?.focus({ preventScroll: true }); return true; }
    l[(i + d + l.length) % l.length]?.focus({ preventScroll: true }); return true;
  }
  if (f?.closest("#mnCartoes")) {
    const l = cartoes(), i = l.indexOf(f);
    if (tecla === "ArrowUp") { itensDoMenu().at(-1)?.focus({ preventScroll: true }); return true; }
    if (tecla === "ArrowDown") return true;
    l[(i + d + l.length) % l.length]?.focus({ preventScroll: true }); return true;
  }
  const l = itensDoMenu(), i = l.indexOf(f);
  if (i < 0) { l[0]?.focus({ preventScroll: true }); return true; }
  if (tecla === "ArrowRight") { if (painel) { focaveis($("mnPainel"))[1]?.focus({ preventScroll: true }); return true; } return false; }
  if (tecla === "ArrowLeft") return false;
  if (tecla === "ArrowDown" && i === l.length - 1) { cartoes()[0]?.focus({ preventScroll: true }); return true; }
  l[Math.max(0, i + d)]?.focus({ preventScroll: true }); return true;
}
function voltar() {
  if (document.body.classList.contains("mn-ajustes")) return fecharAjustes();
  if (painel) return fecharPainel();
  location.href = "/";
}
const haModal = () => !$("modal").classList.contains("hidden") || document.querySelector("dialog[open]");
function aoTeclar(e) {
  if (!naTela || haModal()) return;
  if (e.key.startsWith("Arrow")) { if (mover(e.key)) e.preventDefault(); }
  else if (e.key === "Escape") { e.preventDefault(); voltar(); }
}
const padAntes = {}; let padEspera = 0;
function lerControle() {
  if (!naTela || document.hidden || haModal() || !navigator.getGamepads) return;
  const p = [...navigator.getGamepads()].find(Boolean);
  document.body.classList.toggle("mn-pad", !!p); if (!p) return;
  const b = (i) => !!p.buttons[i]?.pressed, ax = p.axes[0] || 0, ay = p.axes[1] || 0, agora = performance.now();
  const dir = b(12) || ay < -0.55 ? "ArrowUp" : b(13) || ay > 0.55 ? "ArrowDown" : b(14) || ax < -0.55 ? "ArrowLeft" : b(15) || ax > 0.55 ? "ArrowRight" : null;
  if (dir && (dir !== padAntes.dir || agora > padEspera)) { mover(dir); padEspera = agora + (dir === padAntes.dir ? 150 : 340); }
  padAntes.dir = dir;
  const a = b(0), v = b(1);
  if (a && !padAntes.a) document.activeElement?.click?.();
  if (v && !padAntes.b) voltar();
  padAntes.a = a; padAntes.b = v;
}

// ---------- ligar uma vez ----------
let ligado = false;
function ligarUmaVez() {
  if (ligado) return; ligado = true;
  $("mn").addEventListener("click", aoClicar);
  $("mn").addEventListener("pointermove", aoMoverBrilho, { passive: true });
  addEventListener("keydown", aoTeclar);
  $("hName").addEventListener("input", () => { const n = $("hName").value.trim(); $("mnNomeTopo").textContent = n || "Piloto"; store.set("galera:name", n); });
  document.addEventListener("click", (e) => { if (document.body.classList.contains("mn-ajustes") && !e.target.closest(".utilbar,#mnAjustes")) fecharAjustes(); });
  const entrando = (e) => { const i = e.target.closest?.(".mn-item"); if (i) { document.querySelectorAll(".mn-item.foco").forEach((x) => x.classList.remove("foco")); i.classList.add("foco"); } };
  $("mnMenu").addEventListener("pointerover", entrando); $("mnMenu").addEventListener("focusin", entrando);
  $("mnMenu").addEventListener("pointerleave", () => { const f = document.querySelector("#mnMenu .mn-item:focus"); if (f) entrando({ target: f }); });
  itensDoMenu()[0]?.classList.add("foco");
}
