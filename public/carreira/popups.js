// Carreira: os pop-ups de aviso, um de cada vez e nunca por cima de outro:
//  1. antes do jogo: o que está errado na escalação (titulares cansados, lesionados ou suspensos que saem, jogadores improvisados), com a
//     escalação automática à mão. Aparece ao tocar em "Jogar" e só se houver o que avisar (confirmarAntesDoJogo);
//  2. a diretoria: a reunião do começo da temporada, com a meta definida pela força do clube na liga (E.meta), e o aviso de risco quando a
//     campanha está abaixo da meta (em alguns pontos da temporada);
//  4. na sala: a proposta de troca que chegou, com um som discreto (aceitar, recusar ou ver depois).
// "verificar" roda a cada estado novo e quando um pop-up fecha: abre o próximo que estiver pendente (Popups.verificar).
const visto = (chave) => (store.get("carreira:popups") || []).includes(chave);
const marcarVisto = (chave) => { const v = store.get("carreira:popups") || []; if (!v.includes(chave)) store.set("carreira:popups", [...v, chave].slice(-200)); };
const outroAberto = () => !!document.querySelector("dialog[open]");

// ---------- o som discreto (duas notas curtas) ----------
function somDeAviso() {
  if (store.get("carreira:somAvisos") === false) return;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)(), t0 = ac.currentTime;
    for (const [i, f] of [[0, 660], [1, 880]]) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + i * 0.13); g.gain.exponentialRampToValueAtTime(0.06, t0 + i * 0.13 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.13 + 0.22);
      o.connect(g).connect(ac.destination); o.start(t0 + i * 0.13); o.stop(t0 + i * 0.13 + 0.25);
    }
    setTimeout(() => ac.close().catch(() => {}), 800);
  } catch { /* sem áudio: tudo bem */ }
}
// monta um pop-up de aviso (dialog) com título, corpo e botões; devolve a promessa do botão tocado (ou null se fechou)
function popup({ classe = "", titulo, icone = "sino", corpo, botoes }) {
  return new Promise((resolve) => {
    const dlg = document.createElement("dialog");
    dlg.className = `dialogo popup-aviso ${classe}`; dlg.setAttribute("aria-label", titulo);
    dlg.innerHTML = `<h2 class="pa-titulo"><span class="pa-ic">${ic(icone)}</span>${h(titulo)}</h2><div class="pa-corpo">${corpo}</div>
      <div class="pa-botoes">${botoes.map((b, i) => `<button type="button" class="${b.classe || "discreto"}" data-i="${i}">${b.ic ? ic(b.ic) : ""}${h(b.texto)}</button>`).join("")}</div>`;
    document.body.append(dlg);
    let feito = false;
    const fechar = (v) => { if (feito) return; feito = true; if (dlg.open) dlg.close(); dlg.remove(); resolve(v); };
    dlg.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => fechar(botoes[+b.dataset.i].valor)));
    dlg.addEventListener("cancel", () => fechar(null));
    dlg.addEventListener("click", (e) => { if (e.target === dlg) fechar(null); });
    dlg.showModal();
  });
}

// ---------- 1. antes do jogo ----------
const energiaDoJogador = (pid) => (E.energia && E.energia[pid] != null ? E.energia[pid] : 100);
function avisosAntesDoJogo() {
  const esc = E.escalacao, det = Motor.escalacaoDetalhada(meuTime()).filter((v) => v.id), itens = [];
  const cansados = det.filter((v) => energiaDoJogador(v.id) < 70);
  if (cansados.length) itens.push({ ic: "ampulheta", cls: cansados.length >= 3 ? "ruim" : "aviso", titulo: `${cansados.length} titular${cansados.length > 1 ? "es" : ""} cansado${cansados.length > 1 ? "s" : ""}`,
    texto: cansados.map((v) => `${h(sobrenome(nomeJogador(v.id)))} (${energiaDoJogador(v.id)}% de energia${penalidadeSequencia(v.id) ? `, −${penalidadeSequencia(v.id)} no over` : ""})`).join(", ") + ". Quem descansa um jogo recupera 80 pontos de energia e zera a sequência." });
  const fixos = esc.titulares ? esc.titulares.filter((pid) => fora(pid)) : [];
  if (fixos.length) itens.push({ ic: "alerta", cls: "ruim", titulo: `${fixos.length} da escalação não joga${fixos.length > 1 ? "m" : ""}`,
    texto: fixos.map((pid) => `${h(sobrenome(nomeJogador(pid)))} (${fora(pid) === "lesao" ? "machucado" : "suspenso"})`).join(", ") + ". O melhor que sobrou entra no lugar de cada um." });
  const improvisados = det.filter((v) => Taticas.pontosDeEncaixe(JOGADORES[v.id].pos, v.fino) >= 4);
  if (improvisados.length) itens.push({ ic: "troca", cls: "aviso", titulo: `${improvisados.length} improvisado${improvisados.length > 1 ? "s" : ""}`,
    texto: improvisados.map((v) => `${h(sobrenome(nomeJogador(v.id)))} (${POS_NOME[JOGADORES[v.id].pos] || JOGADORES[v.id].pos}) joga de ${(POS_NOME[v.fino] || v.fino || "").toLowerCase()}: −${Taticas.pontosDeEncaixe(JOGADORES[v.id].pos, v.fino)} pontos`).join(" · ") });
  return itens;
}
// devolve true se pode jogar (sem aviso, ou o técnico decidiu seguir); false se ele foi ajustar a escalação ou fechou
async function confirmarAntesDoJogo() {
  if (!E || E.partida) return true;
  const itens = avisosAntesDoJogo();
  if (!itens.length) return true;
  const corpo = `<ul class="pa-lista">${itens.map((i) => `<li class="${i.cls}"><span class="pa-ic">${ic(i.ic)}</span><div><b>${i.titulo}</b><small>${i.texto}</small></div></li>`).join("")}</ul>
    <p class="suave">Quer ajustar antes de apitar? A escalação automática põe em campo o melhor time para hoje, descansando quem está cansado.</p>`;
  const r = await popup({ classe: "antes-jogo", titulo: "Antes de apitar", icone: "apito", corpo, botoes: [
    { texto: "Ajustar a escalação", valor: "ajustar", classe: "secundario", ic: "campo" }, { texto: "Escalação automática e jogar", valor: "auto", classe: "secundario", ic: "brilho" }, { texto: "Jogar assim mesmo", valor: "jogar", classe: "primario" }] });
  if (r === "ajustar") { mostrarTela("elenco"); return false; }
  if (r === "auto") { const x = await pedir("escalacao", { titulares: null }); if (x.ok) receber(x.estado); return !!x.ok; }
  return r === "jogar";
}

// ---------- 2. a diretoria ----------
const posicaoNaLiga = () => { const i = E.tabela.findIndex((l) => l.id === E.clube); return i + 1; };
function popupMeta() {
  const m = E.meta; if (!m) return null;
  const chave = `meta:${E.clube}:${E.temporada}`;
  if (visto(chave)) return null; // uma vez por temporada (também para quem entra no meio)
  marcarVisto(chave);
  const nivel = { titulo: "Alta", continental: "Boa", meio: "Média", rebaixamento: "Baixa" }[m.nivel];
  const corpo = `<p class="pa-lead">A diretoria olhou o elenco: o <b>${h(nomeClube(E.clube))}</b> é o <b>${m.rank}º mais forte</b> entre os ${m.total} clubes da liga (força ${m.forca}).</p>
    <div class="pa-meta"><small>Meta da temporada</small><b>${h(m.texto)}</b><span>Posição final: <strong>${m.alvo}º ou melhor</strong></span></div>
    <p class="suave">Expectativa da torcida: ${nivel}. Cumprir a meta rende um bônus no caixa e anima o vestiário; não cumprir aumenta a pressão. A meta fica no topo da sede.</p>`;
  return popup({ classe: "diretoria", titulo: "Reunião com a diretoria", icone: "aperto", corpo, botoes: [{ texto: "Combinado", valor: "ok", classe: "primario" }] });
}
// o aviso de risco: em alguns pontos da temporada, se o clube está abaixo da meta
const PONTOS_DE_RISCO = [[8, 2], [18, 1], [28, 1]]; // [rodadas da liga jogadas, folga de posições]
function popupRisco() {
  const m = E.meta; if (!m || E.fim || E.rodada < 8) return null;
  const jogadas = E.rodadaLiga ?? E.rodada, pos = posicaoNaLiga();
  for (const [rodadas, folga] of PONTOS_DE_RISCO) {
    if (jogadas < rodadas) continue;
    const chave = `risco:${E.clube}:${E.temporada}:${rodadas}`;
    if (visto(chave)) continue;
    marcarVisto(chave);
    if (jogadas > rodadas + 4 || pos <= m.alvo + folga) continue; // já passou muito do ponto, ou a campanha vai bem
    const linha = E.tabela[pos - 1], alvoLinha = E.tabela[Math.max(0, m.alvo - 1)];
    const corpo = `<p class="pa-lead">A diretoria está preocupada: o <b>${h(nomeClube(E.clube))}</b> é o <b>${pos}º</b> depois de ${jogadas} rodadas (${linha.p} pontos) e a meta é terminar em <b>${m.alvo}º ou melhor</b>.</p>
      <ul class="pa-lista"><li class="aviso"><span class="pa-ic">${ic("grafico")}</span><div><b>${alvoLinha.p - linha.p > 0 ? `${alvoLinha.p - linha.p} ponto${alvoLinha.p - linha.p > 1 ? "s" : ""} atrás de quem está na posição da meta` : "Na briga pela meta"}</b><small>${h(m.texto)}.</small></div></li></ul>
      <p class="suave">O que dá para fazer: reforçar o elenco no mercado, ajustar a tática e a escalação, e dar descanso a quem está cansado.</p>`;
    return popup({ classe: "diretoria risco", titulo: "A diretoria está preocupada", icone: "alerta", corpo, botoes: [{ texto: "Ver o elenco", valor: "elenco", classe: "secundario" }, { texto: "Entendi", valor: "ok", classe: "primario" }] })
      .then((r) => { if (r === "elenco") mostrarTela("elenco"); });
  }
  return null;
}

// ---------- 4. na sala: a proposta de troca que chegou ----------
function popupTroca() {
  if (!EM_GRUPO || typeof SALA === "undefined" || !SALA || !E) return null;
  const nova = (SALA.trocas || []).find((t) => t.para === E.clube && !visto(`troca:${t.id}`));
  if (!nova) return null;
  marcarVisto(`troca:${nova.id}`);
  somDeAviso();
  const de = (SALA.players || []).find((p) => p.clube === nova.de), quem = de ? de.name : nomeClube(nova.de);
  const corpo = `<p class="pa-lead"><b>${h(quem)}</b> (${h(nomeClube(nova.de))}) quer fazer uma troca com você.</p>${propostaTrocaHTML(nova, false).replace(/<footer>[\s\S]*<\/footer>/, "")}
    <p class="suave">Em troca entre técnicos vale qualquer jogador, de qualquer nota, e não conta na cota de compras.</p>`;
  return popup({ classe: "troca-recebida", titulo: "Proposta de troca", icone: "troca", corpo, botoes: [
    { texto: "Ver depois", valor: "depois" }, { texto: "Recusar", valor: "recusar", classe: "discreto" }, { texto: "Aceitar a troca", valor: "aceitar", classe: "primario" }] })
    .then(async (r) => {
      if (r !== "aceitar" && r !== "recusar") return;
      const x = await pedir("trocaResponder", { id: nova.id, acao: r });
      if (!x.ok) return toast(x.error);
      receber(x.estado); toast(r === "aceitar" ? "Troca fechada!" : "Proposta recusada.");
    });
}

// ---------- o que abre a seguir ----------
let verificando = false;
async function verificar() {
  if (verificando || !E || outroAberto() || typeof telaAtual === "undefined" || telaAtual === "partida" || telaAtual === "inicio" || !telaAtual) return;
  if (E.partida || (typeof posJogoEsperado !== "undefined" && posJogoEsperado)) return;
  verificando = true;
  try { await (popupTroca() || (telaAtual === "sede" && (popupMeta() || popupRisco())) || null); } finally { verificando = false; }
}
window.Popups = { verificar, confirmarAntesDoJogo };
// quando um pop-up fecha, olha se tem outro esperando (sem fila: um depois do outro, só quando o anterior fechou)
document.addEventListener("close", () => setTimeout(verificar, 450), true);
