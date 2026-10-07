// Carreira de Treinador (parte 6): a partida na tela. O servidor manda a narração até onde a partida já foi (ou até o
// ponto em que ela parou esperando você); aqui o relógio anda, os lances aparecem no minuto deles e cada gol ganha o
// replay em pixel-art (lances.js, a mecânica do Leilão) com a camisa do clube. Nas paradas, abre a decisão: o lance
// decisivo (as opções com a chance de cada uma; o pênalti nos 6 cantos) ou a parada tática, com a prancheta (trocar
// de lugar, substituir) e a energia de cada um. Decidir manda a resposta ao servidor, que continua do mesmo ponto.
const MOTIVO = { intervalo: "Intervalo", minuto_70: "Reta final: 70 minutos", gol_sofrido: "Tomamos um gol", vermelho: "Cartão vermelho", cansaco: "O time está cansado" };
const NOME_OPCAO = {
  chutar: "chutar de primeira", tocar: "tocar para quem chega", driblar: "driblar o marcador", cruzar: "cruzar na área",
  impedimento: "linha de impedimento", bloco: "bloco baixo", mano: "mano a mano", contra: "pronto para o contra-ataque",
  direto: "chute direto", cruzamento: "cruzamento na área", ensaiada: "jogada ensaiada", barreira: "barreira reforçada", adiantado: "goleiro adiantado", zona: "marcação por zona",
};
const ICONE_LANCE = { gol: "bola", defesa: "luva", perdeu: "alvo", penalti: "alvo", amarelo: "cartas", vermelho: "cartas", lesao: "alerta", sub: "troca", posicao: "troca", formacao: "campo", lance: "chuteira", contra_ataque: "raio", intervalo: "apito", fim: "apito" };
const TEMPO_LANCE = 20000; // ms para decidir um lance; sem resposta, vai a opção de maior chance
const J = { rodada: null, casa: null, fora: null, eventos: [], i: 0, relogio: 0, vel: 1, parado: null, completo: false, ultimoQuadro: 0, decidindo: false, timerLance: null, pulando: false };
const calmo = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const tempoDe = (e) => e.min + (e.acr ? e.acr / 100 : 0);
const minutoTexto = (e) => `${e.min}'${e.acr ? "+" + e.acr : ""}`;
const meuLado = () => (J.casa === E.clube ? 0 : 1);
const clubeDoLado = (lado) => (lado === 0 ? J.casa : J.fora);
// até onde o relógio pode andar: a parada (os acréscimos antes dela também aparecem) ou o fim
const limite = () => (J.parado ? Math.max(tempoDe(J.parado), ...J.eventos.map(tempoDe)) : 96);

// abre a partida: a que está em andamento ou a que acabou de terminar (rodada)
function abrirPartida(rodada) {
  const src = E.partida || (E.ultimo && (rodada == null || E.ultimo.rodada === rodada) ? E.ultimo : null);
  if (!src) return mostrarTela("sede");
  const nova = J.rodada !== src.rodada || J.casa !== src.casa;
  Object.assign(J, { rodada: src.rodada, casa: src.casa, fora: src.fora, eventos: src.eventos, parado: src.parado || null, completo: !E.partida, decidindo: false });
  if (nova) { J.i = 0; J.relogio = 0; $("narracao").innerHTML = ""; $("replays").innerHTML = ""; }
  $("pEscudoCasa").innerHTML = escudo(J.casa, 3); $("pEscudoFora").innerHTML = escudo(J.fora, 3);
  $("pNomeCasa").textContent = nomeClube(J.casa); $("pNomeFora").textContent = nomeClube(J.fora);
  $("partida").style.cssText = `--casa:${CLUBES[J.casa].cores[0]};--fora:${CLUBES[J.fora].cores[0]}`;
  $("pLocal").innerHTML = `${ic("estadio")} Rodada ${src.rodada + 1} · ${h(CLUBES[J.casa].estadio)}`;
  if ($("decisao").open) $("decisao").close();
  $("fimJogo").classList.add("hidden");
  mostrarTela("partida");
  atualizarPlacar();
}
function atualizarPlacar() {
  let g = [0, 0];
  for (let k = 0; k < J.i; k++) if (J.eventos[k].tipo === "gol") g = J.eventos[k].placar;
  const txt = `${g[0]} × ${g[1]}`;
  if ($("pGols").textContent !== txt) $("pGols").textContent = txt;
  const r = J.relogio;
  $("pRelogio").textContent = r >= 90 ? (J.completo && J.i >= J.eventos.length ? "Fim" : "90+'") : r > 45 && r < 46 ? "45+'" : `${Math.max(0, Math.floor(r))}'`;
}

function narrar(e) {
  const jog = h(nomeJogador(e.jogador)), clube = h(nomeClube(clubeDoLado(e.lado)));
  if (e.tipo === "gol") {
    const como = { penalti: " de pênalti", falta: " de falta", contra_ataque: " no contra-ataque" }[e.como] || "";
    return [`<b>GOL do ${clube}!</b> ${jog}${como}${e.assist ? `, passe de ${h(nomeJogador(e.assist))}` : ""}.`, "gol"];
  }
  if (e.tipo === "defesa") return [`${e.goleiro ? h(nomeJogador(e.goleiro)) : "O goleiro"} defende ${e.como === "penalti" ? "o pênalti" : "o chute"} de ${jog}.`, ""];
  if (e.tipo === "perdeu") return [e.como === "penalti" ? `${jog} perde o pênalti!` : `${jog} perde uma boa chance para o ${clube}.`, ""];
  if (e.tipo === "penalti") return [e.chute ? `${jog} bate ${Ritmo.ZONA_NOME[e.chute]}${e.fora ? "... e manda para fora!" : `; o goleiro pula ${Ritmo.ZONA_NOME[e.pulo]}.`}` : `Pênalti para o ${clube}! ${jog} vai bater.`, ""];
  if (e.tipo === "amarelo") return [`Amarelo para ${jog} (${clube}).`, "cartao"];
  if (e.tipo === "vermelho") return [`<b>Expulso!</b> ${jog} (${clube}) ${e.como === "segundo_amarelo" ? "leva o segundo amarelo" : "recebe o vermelho direto"}.`, "vermelho"];
  if (e.tipo === "lesao") return [`${jog} sente e sai machucado (${clube}).`, ""];
  if (e.tipo === "sub") return [`Troca no ${clube}: sai ${h(nomeJogador(e.sai))}, entra ${h(nomeJogador(e.entra))}.`, ""];
  if (e.tipo === "posicao") return [`${h(nomeJogador(e.a))} e ${h(nomeJogador(e.b))} trocam de posição.`, ""];
  if (e.tipo === "formacao") return [`O ${clube} muda para o ${e.formacao}.`, ""];
  if (e.tipo === "lance") return [`A jogada: ${NOME_OPCAO[e.opcao] || e.opcao}. ${e.certo ? "Deu certo!" : "Não deu."}`, e.certo ? "bom" : ""];
  if (e.tipo === "contra_ataque") return [`Roubou e saiu no contra-ataque o ${clube}!`, ""];
  if (e.tipo === "intervalo") return [`Intervalo · ${e.placar[0]} × ${e.placar[1]}`, "apito"];
  if (e.tipo === "fim") return [`Fim de jogo · ${e.placar[0]} × ${e.placar[1]}`, "apito"];
  return [null, ""];
}
function mostrarEvento(e) {
  const [texto, classe] = narrar(e);
  if (!texto) return;
  const li = document.createElement("li");
  li.className = `${classe} lado${e.lado ?? ""}${e.lado === meuLado() ? " nosso" : ""}`;
  li.innerHTML = classe === "apito" ? `<span>${texto}</span>` : `<span class="min">${minutoTexto(e)}</span><span class="ic-lance">${ic(ICONE_LANCE[e.tipo] || "bola")}</span><span>${texto}</span>`;
  if (J.pulando || calmo()) li.classList.add("sem-entrada");
  $("narracao").prepend(li);
  if (e.tipo === "gol") gol(e);
}
// o gol: o replay em pixel-art com a camisa do clube e, se foi seu, a festa
function gol(e) {
  const j = JOGADORES[e.jogador] || { nome: "?", pos: "ATA", nota: 70 }, clube = clubeDoLado(e.lado), outro = clubeDoLado(1 - e.lado);
  const g = { min: e.min, lado: e.lado === 0 ? "A" : "B", nome: j.nome, pos: Motor.grupoDe(j.pos), ovr: notaDe(j), uniforme: uniformeDoClube(clube), uniformeRival: uniformeDoClube(outro) };
  try {
    const telao = Lances.criar(g, { id: `${E.temporada}-${J.rodada}-${J.casa}-${J.fora}`, mins: 90 }, { nome: sobrenome(j.nome), auto: !J.pulando, cobranca: null });
    const item = document.createElement("div"); item.className = "replay" + (clube === E.clube ? " nosso" : "");
    item.appendChild(telao); $("replays").prepend(item);
  } catch (err) { console.warn("replay", err); }
  if (J.pulando) return;
  const placar = $("pGols");
  placar.classList.remove("pulso"); void placar.offsetWidth; placar.classList.add("pulso");
  if (clube === E.clube) festa();
}

// o relógio da partida: 2 minutos de jogo por segundo (6 no 3x) até a próxima parada ou o fim
function passo(agora) {
  const dt = Math.min(0.1, (agora - (J.ultimoQuadro || agora)) / 1000); J.ultimoQuadro = agora;
  if (telaAtual === "partida" && !J.decidindo && !document.hidden) {
    const lim = limite();
    J.relogio = Math.min(lim, J.relogio + dt * 2 * J.vel);
    // um erro num efeito não pode parar o relógio da partida
    while (J.i < J.eventos.length && tempoDe(J.eventos[J.i]) <= J.relogio + 1e-9) { const e = J.eventos[J.i++]; try { mostrarEvento(e); } catch (err) { console.warn("lance", err); } }
    J.pulando = false;
    if (J.i >= J.eventos.length) {
      if (J.parado && J.relogio >= lim) abrirDecisao(J.parado);
      else if (J.completo) { J.relogio = 96; $("fimJogo").classList.remove("hidden"); }
    }
    atualizarPlacar();
  }
  requestAnimationFrame(passo);
}
requestAnimationFrame(passo);
for (const b of document.querySelectorAll("[data-vel]")) b.onclick = () => { J.vel = +b.dataset.vel; for (const x of document.querySelectorAll("[data-vel]")) x.setAttribute("aria-pressed", String(x === b)); };
$("btnPular").onclick = () => { J.pulando = true; J.relogio = limite(); };
$("btnVoltarSede").onclick = () => { J.rodada = null; mostrarTela("sede"); };

// ---------- as decisões ----------
function abrirDecisao(p) {
  J.decidindo = true;
  $("dTempoBox").classList.toggle("hidden", p.tipo !== "lance");
  if (p.tipo === "tatica") decisaoTatica(p); else decisaoLance(p);
  if (!$("decisao").open) $("decisao").showModal();
}
$("decisao").addEventListener("cancel", (e) => e.preventDefault()); // a decisão não fecha no Esc: precisa responder
async function enviarDecisao(resposta) {
  clearTimeout(J.timerLance); J.timerLance = null;
  for (const b of $("dCorpo").querySelectorAll("button")) b.disabled = true;
  const r = await pedir("decidir", { id: J.parado.id, resposta });
  if (!r.ok) { toast(r.error); for (const b of $("dCorpo").querySelectorAll("button")) b.disabled = false; return; }
  receber(r.estado);
  $("decisao").close();
  abrirPartida(J.rodada);
}
function decisaoLance(p) {
  const jog = h(nomeJogador(p.jogador || p.batedor)), adv = h(nomeClube(clubeDoLado(1 - meuLado())));
  const titulos = {
    ataque_favor: ["Ataque perigoso!", `${jog} recebe na entrada da área. Qual é a jogada?`],
    ataque_contra: [`O ${adv} vem para cima!`, `${jog} avança com a bola. Como a defesa reage?`],
    falta_favor: ["Falta perto da área", `${jog} vai para a bola. A jogada é:`],
    falta_contra: ["Falta perigosa contra", `${jog} vai bater. Você arma:`],
    penalti_favor: ["Pênalti para você!", `${jog} na bola. Escolha o canto.`],
    penalti_contra: ["Pênalti contra!", `${jog} vai bater. Para onde o goleiro pula?`],
  };
  const [titulo, texto] = titulos[p.lance] || ["Lance decisivo", ""];
  $("dTitulo").textContent = titulo; $("dTexto").innerHTML = `<span class="min-tag">${minutoTexto(p)}</span> ${texto}`;
  const pct = (o) => Math.round(o.chance * 100);
  if (p.lance.startsWith("penalti")) {
    $("dCorpo").innerHTML = `<div class="trave"><div class="rede">${p.opcoes.map((o) => `<button data-op="${o.id}" aria-label="${h(o.nome)}: ${pct(o)}%"><b>${pct(o)}%</b><small>${h(o.nome)}</small></button>`).join("")}</div></div>
      <p class="suave">${p.lance === "penalti_favor" ? "Chance de gol em cada canto: o goleiro tem as manias dele." : "Chance de defesa em cada canto: o batedor tem as manias dele."}</p>`;
  } else {
    const contra = p.lance.endsWith("contra");
    $("dCorpo").innerHTML = `<div class="opcoes">${p.opcoes.map((o) => `<button class="opcao" data-op="${o.id}"><span>${h(o.nome)}</span><b>${pct(o)}%</b><i style="--v:${pct(o)}%"></i></button>`).join("")}</div>
      <p class="suave">${contra ? "Chance de evitar o gol" : "Chance de gol"}, pelas notas de quem está no lance.</p>`;
  }
  for (const b of $("dCorpo").querySelectorAll("[data-op]")) b.onclick = () => { b.classList.add("escolhida"); enviarDecisao(b.dataset.op); };
  // o tempo: uma transição só, linear, que não recomeça
  const barra = $("dTempo");
  barra.style.transition = "none"; barra.style.transform = "scaleX(1)";
  requestAnimationFrame(() => requestAnimationFrame(() => { barra.style.transition = `transform ${TEMPO_LANCE}ms linear`; barra.style.transform = "scaleX(0)"; }));
  J.timerLance = setTimeout(() => enviarDecisao(Motor.decisaoAutomatica(p)), TEMPO_LANCE);
}
// a parada tática: a prancheta do jogo (trocar de lugar e substituir), a tática e a formação
function decisaoTatica(p) {
  const d = { tatica: { ...p.tatica }, formacao: p.formacao, subs: [], trocas: [] };
  const campo = p.campo.map((v) => ({ ...v })), energia = Object.fromEntries(p.titulares.map((t) => [t.id, t.energia]));
  let banco = p.banco.map((b) => b.id), sel = null;
  $("dTitulo").textContent = MOTIVO[p.motivo] || "Parada técnica";
  const desenhar = () => {
    const sobra = p.subs - d.subs.length;
    $("dTexto").innerHTML = `<span class="min-tag">${minutoTexto(p)}</span> ${h(nomeClube(J.casa))} ${p.placar[0]} × ${p.placar[1]} ${h(nomeClube(J.fora))} · ${sobra} substituiç${sobra === 1 ? "ão" : "ões"}`;
    $("dCorpo").innerHTML = `<div class="tatica-jogo">
      <div class="prancheta-jogo">${campinho(campo, d.formacao === p.formacao ? p.formacao : p.formacao, { selecionado: sel?.onde === "campo" ? sel.i : null, energia })}
        <p class="dica">${sel ? "Toque em quem troca de lugar com ele, ou num reserva para entrar." : "Toque num jogador para trocar de lugar ou substituir."}</p></div>
      <div class="lado-tatica">
        <span class="rotulo">Mentalidade</span><div class="segmentos">${MENTALIDADE.map((t, i) => `<button data-t="mentalidade" data-v="${i - 2}" aria-pressed="${d.tatica.mentalidade === i - 2}">${t}</button>`).join("")}</div>
        <span class="rotulo">Pressão</span><div class="segmentos">${NIVEL.map((t, i) => `<button data-t="pressao" data-v="${i}" aria-pressed="${d.tatica.pressao === i}">${t}</button>`).join("")}</div>
        <span class="rotulo">Linha</span><div class="segmentos">${NIVEL.map((t, i) => `<button data-t="linha" data-v="${i}" aria-pressed="${d.tatica.linha === i}">${t}</button>`).join("")}</div>
        <span class="rotulo">Formação</span><div class="segmentos pequenos">${Object.keys(Escalacao.FORMATIONS.futebol).map((f) => `<button data-f="${f}" aria-pressed="${d.formacao === f}">${f}</button>`).join("")}</div>
        <span class="rotulo">Banco ${sobra > 0 ? "" : "(sem substituições)"}</span>
        <div class="banco-jogo">${banco.map((pid) => `<button data-reserva="${pid}" ${sobra > 0 ? "" : "disabled"}><img class="pix" src="${retrato(pid)}" alt=""><b>${notaDe(JOGADORES[pid])}</b><span>${h(sobrenome(nomeJogador(pid)))}<small>${JOGADORES[pid].pos}</small></span></button>`).join("")}</div>
        ${d.subs.length ? `<p class="trocas-feitas">${d.subs.map(([s, e]) => `${ic("troca")} ${h(sobrenome(nomeJogador(e)))} no lugar de ${h(sobrenome(nomeJogador(s)))}`).join("<br>")}</p>` : ""}
      </div></div>
      <button id="dVoltar" class="primario largo">Voltar ao jogo</button>`;
    $("dCorpo").querySelector(".gramado").onclick = (e) => {
      const b = e.target.closest(".peca"); if (!b || !campo[+b.dataset.i].id) return;
      const i = +b.dataset.i;
      if (sel && sel.i !== i) { const a = campo[sel.i].id, c = campo[i].id; d.trocas.push([a, c]); [campo[sel.i].id, campo[i].id] = [c, a]; sel = null; }
      else sel = sel ? null : { onde: "campo", i };
      desenhar();
    };
    for (const b of $("dCorpo").querySelectorAll("[data-reserva]")) b.onclick = () => {
      if (!sel) return toast("Primeiro toque em quem vai sair, no campo.");
      const sai = campo[sel.i].id, entra = b.dataset.reserva;
      d.subs.push([sai, entra]); campo[sel.i].id = entra; energia[entra] = 100; banco = banco.filter((x) => x !== entra); sel = null;
      desenhar();
    };
    for (const b of $("dCorpo").querySelectorAll("[data-t]")) b.onclick = () => { d.tatica[b.dataset.t] = +b.dataset.v; desenhar(); };
    for (const b of $("dCorpo").querySelectorAll("[data-f]")) b.onclick = () => { d.formacao = b.dataset.f; desenhar(); };
    $("dVoltar").onclick = () => enviarDecisao(d);
  };
  desenhar();
}

if (location.hash.includes("debug")) window.__carreira = { get E() { return E; }, J, pedir, abrirPartida, mostrarTela, abrirFicha };
// a conexão só começa depois que todos os scripts carregaram (o socket pode já estar ligado pela Noite)
socket.on("connect", conectar);
socket.on("disconnect", () => { $("conexao").textContent = "Sem conexão"; });
socket.on("connect_error", () => { $("conexao").textContent = "Sem conexão"; });
if (socket.connected) conectar(); else socket.connect();
