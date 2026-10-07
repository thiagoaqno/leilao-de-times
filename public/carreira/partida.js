// Carreira de Treinador (parte 3 de 3): a partida na tela. O servidor manda a narração até onde a partida já foi (ou
// até o ponto em que ela parou esperando você); aqui o relógio anda e os lances aparecem no minuto deles. Nas paradas,
// abre a decisão: a tática (intervalo, gol sofrido, vermelho, cansaço, 70') ou o lance decisivo (com a chance de cada
// opção). Decidir manda a resposta ao servidor, que continua o jogo do mesmo ponto.
const MOTIVO = { intervalo: "Intervalo", minuto_70: "Reta final: 70 minutos", gol_sofrido: "Tomamos um gol", vermelho: "Cartão vermelho", cansaco: "O time está cansado" };
const NOME_OPCAO = {
  chutar: "chutar de primeira", tocar: "tocar para quem chega", driblar: "driblar o marcador", cruzar: "cruzar na área",
  impedimento: "fazer a linha de impedimento", bloco: "marcar em bloco baixo", mano: "marcar mano a mano", contra: "deixar o time pronto para o contra-ataque",
  direto: "chute direto", cruzamento: "cruzamento na área", ensaiada: "jogada ensaiada", barreira: "barreira com mais gente", adiantado: "goleiro adiantado", zona: "marcar por zona",
};
const TEMPO_LANCE = 20000; // ms para decidir um lance; sem resposta, vai a opção de maior chance
const J = { rodada: null, casa: null, fora: null, eventos: [], i: 0, relogio: 0, vel: 1, parado: null, completo: false, ultimoQuadro: 0, decidindo: false, timerLance: null };

const tempoDe = (e) => e.min + (e.acr ? e.acr / 100 : 0);
const minutoTexto = (e) => `${e.min}'${e.acr ? "+" + e.acr : ""}`;
const meuLado = () => (J.casa === E.clube ? 0 : 1);
const clubeDoLado = (lado) => (lado === 0 ? J.casa : J.fora);

// abre a partida: a que está em andamento ou a que acabou de terminar (rodada)
function abrirPartida(rodada) {
  const src = E.partida || (E.ultimo && (rodada == null || E.ultimo.rodada === rodada) ? E.ultimo : null);
  if (!src) return mostrarTela("sede");
  const nova = J.rodada !== src.rodada || J.casa !== src.casa;
  Object.assign(J, { rodada: src.rodada, casa: src.casa, fora: src.fora, eventos: src.eventos, parado: src.parado || null, completo: !E.partida, decidindo: false });
  if (nova) { J.i = 0; J.relogio = 0; $("narracao").innerHTML = ""; }
  $("pEscudoCasa").innerHTML = escudo(J.casa); $("pEscudoFora").innerHTML = escudo(J.fora);
  $("pNomeCasa").textContent = nomeClube(J.casa); $("pNomeFora").textContent = nomeClube(J.fora);
  $("decisao").classList.add("hidden"); $("fimJogo").classList.add("hidden");
  mostrarTela("partida");
  atualizarPlacar();
}
function atualizarPlacar() {
  let g = [0, 0];
  for (let k = 0; k < J.i; k++) if (J.eventos[k].tipo === "gol") g = J.eventos[k].placar;
  $("pGols").textContent = `${g[0]} × ${g[1]}`;
  const r = J.relogio;
  $("pRelogio").textContent = r >= 90 ? (J.completo && J.i >= J.eventos.length ? "Fim" : "90+'") : r > 45 && r < 46 ? "45+'" : `${Math.max(0, Math.floor(r))}'`;
}

function narrar(e) {
  const jog = h(nomeJogador(e.jogador)), clube = h(nomeClube(clubeDoLado(e.lado)));
  if (e.tipo === "gol") {
    const como = { penalti: " de pênalti", falta: " de falta", contra_ataque: " no contra-ataque" }[e.como] || "";
    return [`${Icones.ic("bola")} <b>GOL do ${clube}!</b> ${jog}${como}${e.assist ? `, passe de ${h(nomeJogador(e.assist))}` : ""}. ${e.placar[0]} × ${e.placar[1]}`, "gol"];
  }
  if (e.tipo === "defesa") return [`${e.goleiro ? h(nomeJogador(e.goleiro)) : "O goleiro"} defende ${e.como === "penalti" ? "o pênalti" : "o chute"} de ${jog}.`, ""];
  if (e.tipo === "perdeu") return [e.como === "penalti" ? `${jog} perde o pênalti!` : `${jog} perde uma boa chance para o ${clube}.`, ""];
  if (e.tipo === "penalti") return [e.chute ? `${jog} bate ${Ritmo.ZONA_NOME[e.chute]}${e.fora ? "... e manda para fora!" : `; o goleiro pula ${Ritmo.ZONA_NOME[e.pulo]}.`}` : `Pênalti para o ${clube}! ${jog} vai bater.`, ""];
  if (e.tipo === "amarelo") return [`Cartão amarelo para ${jog} (${clube}).`, ""];
  if (e.tipo === "vermelho") return [`<b>Expulso!</b> ${jog} (${clube}) ${e.como === "segundo_amarelo" ? "leva o segundo amarelo" : "recebe o vermelho direto"}.`, "vermelho"];
  if (e.tipo === "lesao") return [`${jog} sente e sai machucado (${clube}).`, ""];
  if (e.tipo === "sub") return [`Troca no ${clube}: sai ${h(nomeJogador(e.sai))}, entra ${h(nomeJogador(e.entra))}.`, ""];
  if (e.tipo === "formacao") return [`O ${clube} muda para o ${e.formacao}.`, ""];
  if (e.tipo === "lance") return [`Escolha: ${NOME_OPCAO[e.opcao] || e.opcao}. ${e.certo ? "Deu certo!" : "Não deu."}`, ""];
  if (e.tipo === "contra_ataque") return [`Roubou e saiu no contra-ataque o ${clube}!`, ""];
  if (e.tipo === "intervalo") return [`Intervalo: ${e.placar[0]} × ${e.placar[1]}`, "apito"];
  if (e.tipo === "fim") return [`Fim de jogo: ${e.placar[0]} × ${e.placar[1]}`, "apito"];
  return [null, ""];
}
function mostrarEvento(e) {
  const [texto, classe] = narrar(e);
  if (!texto) return;
  const li = document.createElement("li");
  li.className = classe;
  li.innerHTML = classe === "apito" ? texto : `<span class="min">${minutoTexto(e)}</span><span>${texto}</span>`;
  $("narracao").prepend(li);
}

// o relógio da partida: anda 2 minutos de jogo por segundo (6 no 3x) até a próxima parada ou o fim
function passo(agora) {
  const dt = Math.min(0.1, (agora - (J.ultimoQuadro || agora)) / 1000); J.ultimoQuadro = agora;
  if (telaAtual === "partida" && !J.decidindo && !document.hidden) {
    const limite = J.parado ? tempoDe(J.parado) : 96;
    J.relogio = Math.min(limite, J.relogio + dt * 2 * J.vel);

    while (J.i < J.eventos.length && tempoDe(J.eventos[J.i]) <= J.relogio + 1e-9) { mostrarEvento(J.eventos[J.i]); J.i++; }
    if (J.i >= J.eventos.length) {
      if (J.parado && J.relogio >= limite) abrirDecisao(J.parado);
      else if (J.completo) { J.relogio = 96; $("fimJogo").classList.remove("hidden"); }
    }
    atualizarPlacar();
  }
  requestAnimationFrame(passo);
}
requestAnimationFrame(passo);
for (const b of document.querySelectorAll("[data-vel]")) b.onclick = () => { J.vel = +b.dataset.vel; for (const x of document.querySelectorAll("[data-vel]")) x.setAttribute("aria-pressed", String(x === b)); };
$("btnPular").onclick = () => { J.relogio = J.parado ? tempoDe(J.parado) : 96; };
$("btnVoltarSede").onclick = () => { J.rodada = null; mostrarTela("sede"); };

// ---------- as decisões ----------
function abrirDecisao(p) {
  J.decidindo = true;
  $("decisao").classList.remove("hidden");
  $("dTempo").parentElement.classList.toggle("hidden", p.tipo !== "lance");
  if (p.tipo === "tatica") decisaoTatica(p); else decisaoLance(p);
}
async function enviarDecisao(resposta) {
  clearTimeout(J.timerLance); J.timerLance = null;
  for (const b of $("dCorpo").querySelectorAll("button")) b.disabled = true;
  const r = await pedir("decidir", { id: J.parado.id, resposta });
  if (!r.ok) { toast(r.error); for (const b of $("dCorpo").querySelectorAll("button")) b.disabled = false; return; }
  receber(r.estado);
  $("decisao").classList.add("hidden");
  abrirPartida(J.rodada);
}
function decisaoLance(p) {
  const jog = h(nomeJogador(p.jogador || p.batedor)), adv = h(nomeClube(clubeDoLado(1 - meuLado())));
  const titulos = {
    ataque_favor: ["Ataque perigoso!", `${jog} recebe na entrada da área... você:`],
    ataque_contra: [`Ataque perigoso do ${adv}!`, `${jog} vem com a bola... você:`],
    falta_favor: ["Falta perto da área!", `${jog} vai para a bola. A jogada é:`],
    falta_contra: ["Falta perigosa contra!", `${jog} vai bater. Você arma:`],
    penalti_favor: ["Pênalti para você!", `${jog} na bola. Onde ele bate?`],
    penalti_contra: ["Pênalti contra!", `${jog} vai bater. Para onde o goleiro pula?`],
  };
  const [titulo, texto] = titulos[p.lance] || ["Lance decisivo", ""];
  $("dTitulo").textContent = titulo; $("dTexto").innerHTML = `${minutoTexto(p)} · ${texto}`;
  const pct = (o) => Math.round(o.chance * 100);
  if (p.lance.startsWith("penalti")) {
    $("dCorpo").innerHTML = `<div class="gol-6">${p.opcoes.map((o) => `<button data-op="${o.id}" title="${h(o.nome)}"><span class="pct">${pct(o)}%</span>${h(o.nome)}</button>`).join("")}</div><p class="suave">${p.lance === "penalti_favor" ? "Chance de gol em cada canto (o goleiro tem as manias dele)." : "Chance de defesa em cada canto (o batedor tem as manias dele)."}</p>`;
  } else {
    const legenda = p.lance.endsWith("contra") ? "chance de evitar o gol" : "chance de gol";
    $("dCorpo").innerHTML = `<div class="opcoes">${p.opcoes.map((o) => `<button class="opcao" data-op="${o.id}"><span>${h(o.nome)}</span><span class="pct">${pct(o)}%</span><span class="barra"><i style="width:${pct(o)}%"></i></span></button>`).join("")}</div><p class="suave">A porcentagem é a ${legenda}, pelas notas de quem está no lance.</p>`;
  }
  for (const b of $("dCorpo").querySelectorAll("[data-op]")) b.onclick = () => enviarDecisao(b.dataset.op);
  // o tempo: a barra encolhe com uma transição só (não recomeça a cada desenho)
  const barra = $("dTempo");
  barra.style.transition = "none"; barra.style.transform = "scaleX(1)";
  requestAnimationFrame(() => requestAnimationFrame(() => { barra.style.transition = `transform ${TEMPO_LANCE}ms linear`; barra.style.transform = "scaleX(0)"; }));
  J.timerLance = setTimeout(() => enviarDecisao(Motor.decisaoAutomatica(p)), TEMPO_LANCE);
}
function decisaoTatica(p) {
  const d = { tatica: { ...p.tatica }, formacao: p.formacao, subs: [] };
  $("dTitulo").textContent = MOTIVO[p.motivo] || "Parada técnica";
  $("dTexto").innerHTML = `${minutoTexto(p)} · ${h(nomeClube(J.casa))} ${p.placar[0]} × ${p.placar[1]} ${h(nomeClube(J.fora))}. Trocas restantes: ${p.subs}.`;
  const desenhar = () => {
    const usados = new Set(d.subs.flat()), sobra = p.subs - d.subs.length;
    const titulares = p.titulares.filter((t) => !usados.has(t.id)), banco = p.banco.filter((b) => !usados.has(b.id));
    $("dCorpo").innerHTML = `
      <label>Mentalidade</label><div class="botoes-5">${MENTALIDADE.map((t, i) => `<button data-t="mentalidade" data-v="${i - 2}" aria-pressed="${d.tatica.mentalidade === i - 2}">${t}</button>`).join("")}</div>
      <div class="campos" style="margin:8px 0 0">
        <div><label>Pressão</label><div class="botoes-3">${NIVEL.map((t, i) => `<button data-t="pressao" data-v="${i}" aria-pressed="${d.tatica.pressao === i}">${t}</button>`).join("")}</div></div>
        <div><label>Linha de defesa</label><div class="botoes-3">${NIVEL.map((t, i) => `<button data-t="linha" data-v="${i}" aria-pressed="${d.tatica.linha === i}">${t}</button>`).join("")}</div></div>
      </div>
      <label>Formação<select id="dFormacao">${Object.keys(Escalacao.FORMATIONS.futebol).map((f) => `<option ${f === d.formacao ? "selected" : ""}>${f}</option>`).join("")}</select></label>
      <div class="trocas"><label>Trocas</label>
        ${d.subs.map(([s, e]) => `<span class="troca-feita">Sai ${h(nomeJogador(s))}, entra ${h(nomeJogador(e))}</span>`).join("")}
        ${sobra > 0 && banco.length ? `<div class="linha"><select id="dSai" aria-label="Quem sai">${titulares.filter((t) => t.pos !== "GK").concat(titulares.filter((t) => t.pos === "GK")).map((t) => `<option value="${t.id}">${h(t.nome)} · ${t.energia}%${t.amarelos ? " · amarelo" : ""}</option>`).join("")}</select>
        <select id="dEntra" aria-label="Quem entra">${banco.map((b) => `<option value="${b.id}">${h(b.nome)} (${b.nota})</option>`).join("")}</select><button id="dTrocar">Trocar</button></div>` : `<span class="troca-feita">${sobra > 0 ? "Ninguém no banco." : "Sem trocas sobrando."}</span>`}
      </div>
      <button id="dVoltar" class="primario largo">Voltar ao jogo</button>`;
    for (const b of $("dCorpo").querySelectorAll("[data-t]")) b.onclick = () => { d.tatica[b.dataset.t] = +b.dataset.v; desenhar(); };
    $("dFormacao").onchange = () => { d.formacao = $("dFormacao").value; };
    if ($("dTrocar")) $("dTrocar").onclick = () => { d.subs.push([$("dSai").value, $("dEntra").value]); desenhar(); };
    $("dVoltar").onclick = () => enviarDecisao(d);
  };
  desenhar();
}

if (location.hash.includes("debug")) window.__carreira = { get E() { return E; }, J, pedir, abrirPartida, mostrarTela };
socket.connect();
