// Leilão da Galera — o elenco ganhando vida (carregado depois das outras partes do script da página; divide as mesmas
// variáveis globais: S, me, socket, $, esc, escA, toast, render, capById, T, isFootball, skinNow).
// - quem foi comprado (ou trocado) sai voando da carta do palco (ou do outro time) até a vaga no time novo, ou até o
//   cartão do time no placar, quando o time não está aberto ao lado; na revelação, o voo espera o carimbo (atrasoVoo);
// - quem muda de posição no campinho desliza até o lugar novo;
// - o jogador fala num balãozinho: ao chegar no time e ao mudar de posição;
// - o nome do time;
// - as trocas 1 por 1 depois do leilão (o organizador abre).
const VOO_MS = 850, FALA_MS = 3600;
const semMovimentoE = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- frases ----------
// {t} = o nome do time; {p} = quanto custou
const FALAS = {
  chegada: [
    "Meu sonho sempre foi jogar no {t}!", "Desde pequeno eu dormia com a camisa do {t}.",
    "Vim pelo projeto, não pelo dinheiro. Tá, um pouco pelo dinheiro.", "Minha mãe tá chorando de emoção. Obrigado, {t}!",
    "Já beijei o escudo. Onde fica o vestiário?", "Recusei proposta da Europa pra estar aqui no {t}.",
    "Cheguei pra ser campeão, e não é pouca coisa não.", "O {t} é gigante. E agora tem eu.",
    "Meu empresário disse que era time grande. E é mesmo!", "Torcida do {t}, pode confiar: vou deixar a vida em campo!",
    "Obrigado pela oportunidade, {t}. Deus é bom o tempo todo!", "Primeira coisa: alguém me passa a senha do Wi-Fi?",
    "Já sei o hino de cor. Quase de cor.", "Aqui é trabalho, irmão. Bora pra cima!",
    "{p} moedas foi pouco pelo futebol que eu vou jogar.", "Mal cheguei no {t} e já quero a camisa 10.",
    "Meu avô jogou aqui. Mentira, mas eu queria muito.", "Eu não ganhei o leilão: o {t} que me ganhou.",
    "Vou honrar cada uma das {p} moedas!", "Já tô me sentindo em casa. Cadê o churrasco de boas-vindas?",
  ],
  troca: [
    "Fui trocado? Melhor pra mim!", "Novo time, mesma vontade de ganhar.", "Nem desfiz a mala e já mudei pro {t}.",
    "Troca boa pra todo mundo. Principalmente pra mim.", "O {t} acertou em cheio nessa troca!",
  ],
  comida: [
    "Sempre sonhei em estar num prato de respeito!", "Cheguei pra dar sabor ao {t}!", "Fresquinho e pronto pra brilhar.",
    "Minha avó dizia que eu nasci pra esse prato.", "Sem mim isso aqui ia ficar sem graça.", "Vim direto da feira pro {t}!",
    "Já tô temperado e animado!", "O júri vai me amar, pode anotar.", "Sabor de campeão, hein!",
    "Eu e o {t}: combinação perfeita.", "Cuidado, que eu sou o ingrediente secreto.", "Mal cheguei e já tô dando água na boca.",
  ],
  geral: [
    "Meu sonho sempre foi entrar pro {t}!", "Cheguei pra fazer história no {t}.", "Bora, {t}! Agora sim o time tá completo.",
    "Valeu a confiança! Não vou decepcionar.", "Já tô me sentindo em casa.", "O {t} ganhou um reforço de peso!",
    "Cheguei chegando!", "Pode me colocar pra jogar que eu resolvo.",
  ],
  melhor: [
    "Agora sim, professor! Essa é a minha posição.", "Aqui eu rendo o dobro, pode confiar.", "Finalmente alguém entendeu meu futebol!",
    "Nessa posição eu jogo de olho fechado.", "Ahh, agora o time encaixou!", "Professor, o senhor é um gênio tático.",
    "Era isso que eu queria: jogar no meu lugar.", "Voltei pra casa!",
  ],
  pior: [
    "Professor… tem certeza disso?", "Nunca joguei aí, mas vou tentar, né?", "Tá bom, eu jogo onde o senhor mandar…",
    "Isso aqui não é a minha praia não.", "Meu empresário vai ligar pro senhor.", "Improvisado de novo? Tudo bem…",
    "Se der errado, a culpa não é minha, hein!", "Vou precisar de um tutorial no YouTube.",
  ],
  gol: [
    "Goleiro? Eu? Tá bom, né…", "Alguém me empresta as luvas?", "Nunca agarrei nem um resfriado, professor!",
    "Vou fechar o gol. Ou pelo menos tentar.", "Se a bola vier, eu saio correndo.",
  ],
  reserva: [
    "Banco? Vou ficar de olho no aquecimento.", "Tudo bem, eu entro e resolvo no segundo tempo.", "Reserva de luxo, hein, professor.",
    "Vou sentar aqui e torcer pelos companheiros.", "Banco? Meu empresário não vai gostar nada disso.", "Pelo menos o banco é acolchoado?",
  ],
  titular: [
    "Até que enfim! Tava congelando no banco.", "Chegou a minha hora, professor!", "Pode deixar, não vou decepcionar!",
    "Saí do banco com sangue nos olhos!", "Aquecido e pronto pra jogar!",
  ],
  igual: [
    "Tanto faz, professor, eu jogo em qualquer lugar.", "De um lado ou do outro, eu dou conta.",
    "Mudou o lugar, mas o futebol é o mesmo.", "Onde precisar, eu tô lá.",
  ],
};
// cada grupo de frases é embaralhado e usado em ordem: não repete até usar todas
const filaFalas = {};
function frase(grupo, vars) {
  if (!filaFalas[grupo] || !filaFalas[grupo].length) filaFalas[grupo] = FALAS[grupo].slice().sort(() => Math.random() - 0.5);
  return filaFalas[grupo].pop().replace(/\{t\}/g, vars.t || "time").replace(/\{p\}/g, vars.p != null ? vars.p : "tantas");
}
const nomeTime = (c) => c.teamName || `${T().prefix || "Time"} ${c.name}`;

// ---------- balõezinhos ----------
// chave "idDoTime|nome" -> { txt, t0 }. O campinho, o prato e a lista desenham o balão enquanto ele vale (com atraso
// negativo na animação, para redesenhar a tela no meio não recomeçar).
const falas = new Map();
function falar(chave, txt, atraso = 0) {
  falas.set(chave, { txt, t0: performance.now() + atraso });
  setTimeout(() => S && render(), atraso + FALA_MS + 30);
  if (atraso) setTimeout(() => S && render(), atraso + 10);
}
// o HTML do balão daquela chave (ou ""); "onde" ajusta o lado para não sair do campinho
function balao(chave, onde = "") {
  const f = falas.get(chave); if (!f) return "";
  const age = performance.now() - f.t0;
  if (age < 0) return "";
  if (age > FALA_MS) { falas.delete(chave); return ""; }
  return `<em class="fala ${onde}" style="animation-delay:-${Math.round(age)}ms">${esc(f.txt)}</em>`;
}

// ---------- chegada voando ----------
// Quando um item aparece num time (comprado ou trocado), ele é anotado aqui; depois que a tela é redesenhada, sai um
// cartãozinho voando de onde ele estava (a roleta, ou a vaga no outro time) até o lugar novo.
let pendentesVoo = [], donoAntes = new Map(), retAntes = new Map();
// o estado da chegada (para as classes): "voando" esconde o lugar enquanto o cartão voa; "new" faz ele pousar
function chegada(key) {
  const age = performance.now() - arrivedAt.get(key);
  if (age < VOO_MS) return { cls: " voando", style: "" };
  if (age < VOO_MS + 600) return { cls: " new", style: `;animation-delay:-${Math.round(age - VOO_MS)}ms` };
  return { cls: "", style: "" };
}
// primeira vez que o item aparece no time: guarda a hora e, se não for o carregamento da página, prepara o voo e a fala
function viuItem(c, item, key) {
  if (arrivedAt.has(key)) return;
  const now = performance.now();
  if (!pitchSeeded || semMovimentoE()) { arrivedAt.set(key, pitchSeeded ? now - VOO_MS : -1e9); if (pitchSeeded) falaChegada(c, item, key, 0, false); return; }
  const atraso = typeof atrasoVoo === "number" ? atrasoVoo : 0;
  arrivedAt.set(key, now + atraso);
  const nome = Ratings.parseItem(item).name, antes = donoAntes.get(item);
  pendentesVoo.push({ c, item, nome, key, atraso, de: antes && antes !== c.id ? antes : null });
  falaChegada(c, item, key, atraso + VOO_MS + 250, !!(antes && antes !== c.id));
}
function falaChegada(c, item, key, atraso, trocado) {
  const t = c.team.find((x) => x.player === item), food = !!skinNow, fb = isFootball();
  const grupo = trocado ? "troca" : food ? "comida" : fb ? "chegada" : "geral";
  falar(food ? c.id + "|*" : key, frase(grupo, { t: nomeTime(c), p: t ? t.price : null }), atraso);
}
// guarda onde cada item estava (e de quem era) antes de redesenhar os times
function antesDeDesenhar() {
  retAntes = new Map();
  document.querySelectorAll("#teams [data-item]").forEach((el) => retAntes.set(el.closest("[data-team]").dataset.team + "|" + el.dataset.item, el.getBoundingClientRect()));
}
function depoisDeDesenhar() {
  const centro = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  // quem já estava no mesmo time e mudou de lugar desliza do lugar antigo até o novo
  if (!semMovimentoE()) document.querySelectorAll("#teams [data-item]").forEach((el) => {
    const team = el.closest("[data-team]").dataset.team, old = retAntes.get(team + "|" + el.dataset.item);
    if (!old || el.classList.contains("voando") || el.classList.contains("new")) return;
    const r = el.getBoundingClientRect(), dx = old.left - r.left, dy = old.top - r.top;
    if (Math.abs(dx) + Math.abs(dy) > 3) el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], { duration: 520, easing: "cubic-bezier(.3,.9,.3,1)" });
  });
  // os que chegaram: voam da carta do palco (ou do time de onde vieram) até o lugar novo. As posições são medidas na
  // hora em que o voo sai (na revelação, ele espera o carimbo e a tela pode ter mudado até lá)
  const voos = pendentesVoo; pendentesVoo = [];
  const ondeDe = (id) => document.querySelector(`#teams [data-team="${id}"]`) || $("placar").querySelector(`[data-cap="${id}"]`);
  voos.forEach((v, k) => {
    const deRet = v.de ? retAntes.get(v.de + "|" + v.nome) : null;
    setTimeout(() => {
      const card = document.querySelector(`#teams [data-team="${v.c.id}"]`);
      const alvo = (card && (card.querySelector(`[data-item="${CSS.escape(v.nome)}"]`) || card.querySelector(".dish, .pitch, ol"))) || $("placar").querySelector(`[data-cap="${v.c.id}"]`);
      if (!alvo) return;
      let de;
      if (v.de) { const o = ondeDe(v.de); de = centro(deRet || (o || alvo).getBoundingClientRect()); }
      else { const c = $("cartaAtual") || $("cena"), r = c && c.getBoundingClientRect(); de = r && r.width ? centro(r) : { x: innerWidth / 2, y: innerHeight / 3 }; }
      voarItem(v, de, centro(alvo.getBoundingClientRect()), 0);
    }, v.atraso + k * 120);
  });
  // o item novo continua escondido até o fim do voo: redesenha para ele pousar
  if (voos.length) setTimeout(() => S && render(), Math.max(...voos.map((v) => v.atraso)) + VOO_MS + 40 + (voos.length - 1) * 120);
  // de quem era cada item agora (para saber, na próxima vez, de onde ele veio)
  donoAntes = new Map(); (S.captains || []).forEach((c) => c.team.forEach((t) => donoAntes.set(t.player, c.id)));
}
function voarItem(v, a, b, atraso) {
  const el = document.createElement("div"), fb = isFootball();
  const r = fb ? Ratings.ratingOf(v.item) : null;
  el.className = "vooItem" + (fb ? "" : " semNota");
  el.innerHTML = `${fb ? `${window.Rostos ? `<img class="pix" src="${Rostos.de(v.nome)}" alt="">` : ""}<b>${r.ovr}</b>` : ""}<span>${esc(fb ? shortName(v.nome) : v.nome)}</span>`;
  ($("vooLeilao") || document.body).appendChild(el);
  const lift = Math.min(160, 50 + Math.hypot(b.x - a.x, b.y - a.y) * 0.25);
  const at = (x, y, s, rz) => `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${rz}deg) scale(${s})`;
  el.animate([
    { transform: at(a.x, a.y, 0.6, -8), opacity: 0 },
    { transform: at(a.x + (b.x - a.x) * 0.15, a.y - lift * 0.45, 1.2, -3), opacity: 1, offset: 0.2 },
    { transform: at((a.x + b.x) / 2, Math.min(a.y, b.y) - lift, 1.15, 5), opacity: 1, offset: 0.55 },
    { transform: at(b.x, b.y, 0.8, 0), opacity: 0.9 },
  ], { duration: VOO_MS, delay: atraso, easing: "cubic-bezier(.37,0,.25,1)", fill: "both" }).finished.then(() => el.remove(), () => el.remove());
}

// ---------- falas ao mudar de posição (o meu campinho) ----------
// a escalação antes (na tela) e depois (com as posições novas): cada um que mudou de lugar fala conforme rende
function falasDaTroca(mine, nomes, pins) {
  const antes = myShown && myShown.E; if (!antes) return;
  const depois = Escalacao.escalar(mine.team.map((x) => x.player), formKind(), mine.formation, pins);
  const onde = (E, n) => { const x = E.xi.find((x) => x.p && x.p.name === n); return x ? { slot: x.slot, eff: x.eff * (x.cm || 1), pos: x.p.pos } : { slot: "BENCH" }; };
  nomes.filter(Boolean).forEach((n, k) => {
    const a = onde(antes, n), d = onde(depois, n);
    if (a.slot === d.slot && Math.abs((a.eff || 0) - (d.eff || 0)) < 0.5) return;
    const grupo = d.slot === "BENCH" ? "reserva" : a.slot === "BENCH" ? "titular" : d.slot === "GK" && d.pos !== "GK" ? "gol"
      : d.eff > a.eff + 0.5 ? "melhor" : d.eff < a.eff - 0.5 ? "pior" : "igual";
    if (d.slot === "BENCH") return toast(`${shortName(n)}: "${frase(grupo, {})}"`); // na reserva não tem vaga no campinho para o balão
    falar(mine.id + "|" + n, frase(grupo, { t: nomeTime(mine) }), 450 + k * 250);
  });
}

// ---------- nome do time ----------
function renderNome() {
  const mine = me.capId && capById(me.capId), box = $("nomeBox"); if (!box) return;
  const show = !!mine && verTime === mine.id && nomeAberto;
  box.classList.toggle("hidden", !show);
  if (!show) return;
  const inp = $("teamNameIn");
  if (document.activeElement !== inp) inp.value = mine.teamName || "";
  inp.placeholder = `Ex.: Galáticos da ${mine.name}`;
}
function salvarNome() {
  socket.emit("teamName", { nome: $("teamNameIn").value }, (r) => { if (r && !r.ok) toast(r.error); else { toast($("teamNameIn").value.trim() ? "Nome do time salvo!" : "Nome do time apagado."); $("teamNameIn").blur(); nomeAberto = false; if (S) render(); } });
}
$("teamNameBtn").onclick = salvarNome;
$("teamNameIn").addEventListener("keydown", (e) => { if (e.key === "Enter") salvarNome(); });

// ---------- trocas depois do leilão ----------
const nomeItem = (it) => Ratings.parseItem(it).name;
const notaItem = (it) => (isFootball() ? ` (${Ratings.ratingOf(it).ovr})` : "");
function opcoes(sel, lista, vazio) {
  const html = (vazio ? `<option value="">${esc(vazio)}</option>` : "") + lista.map(([v, l]) => `<option value="${escA(v)}">${esc(l)}</option>`).join("");
  if (sel.dataset.html === html) return;
  const val = sel.value; sel.innerHTML = html; sel.dataset.html = html;
  if ([...sel.options].some((o) => o.value === val)) sel.value = val;
}
function renderTrocas() {
  const tr = S.trocas, card = $("trocasCard"), mine = me.capId && capById(me.capId);
  if (me.host) {
    $("hTrocas").classList.toggle("hidden", S.phase !== "done");
    $("hTrocasTxt").textContent = tr && tr.aberto ? "Fechar trocas" : "Abrir trocas";
  }
  const show = !!(tr && tr.aberto && mine);
  card.classList.toggle("hidden", !show);
  if (!show) return;
  const outros = S.captains.filter((c) => c.id !== me.capId && c.team.length);
  opcoes($("trMeu"), mine.team.map((t) => [t.player, nomeItem(t.player) + notaItem(t.player)]), `Seu ${T().item}`);
  opcoes($("trCom"), outros.map((c) => [c.id, nomeTime(c)]), `Com quem`);
  const o = capById($("trCom").value);
  opcoes($("trDele"), o ? o.team.map((t) => [t.player, nomeItem(t.player) + notaItem(t.player)]) : [], o ? `${cap(T().item)} do ${nomeTime(o)}` : "Escolha o time primeiro");
  const linha = (p, recebi) => {
    const outro = capById(recebi ? p.de : p.para); if (!outro) return "";
    const dou = recebi ? p.dele : p.meu, recebo = recebi ? p.meu : p.dele;
    return `<div class="trprop${recebi ? " recebi" : ""}"><div>${recebi ? `<b>${esc(outro.name)}</b> quer trocar` : `Você propôs para <b>${esc(outro.name)}</b>:`}
      <span class="trpar"><span class="sai">${esc(nomeItem(dou))}${esc(notaItem(dou))}</span>${ic("troca")}<span class="vem">${esc(nomeItem(recebo))}${esc(notaItem(recebo))}</span></span></div>
      <div class="row" style="gap:6px">${recebi ? `<button class="primary" onclick="trocar('aceitar','${p.id}')">Aceitar</button><button onclick="trocar('recusar','${p.id}')">Recusar</button>` : `<button class="ghost" onclick="trocar('cancelar','${p.id}')">Cancelar</button>`}</div></div>`;
  };
  const rec = tr.props.filter((p) => p.para === me.capId), fiz = tr.props.filter((p) => p.de === me.capId);
  $("trLista").innerHTML = (rec.length ? `<h4>Propostas para você</h4>${rec.map((p) => linha(p, true)).join("")}` : "")
    + (fiz.length ? `<h4>Suas propostas</h4>${fiz.map((p) => linha(p, false)).join("")}` : "")
    + (!rec.length && !fiz.length ? `<p class="hint" style="margin:8px 0 0">Nenhuma proposta por enquanto.</p>` : "");
}
function trocar(acao, id) { socket.emit("troca", { acao, id }, (r) => { if (r && !r.ok) toast(r.error); else if (acao === "aceitar") toast("Troca feita!"); }); }
$("trCom").addEventListener("change", () => S && renderTrocas());
$("trPropor").onclick = () => {
  const d = { acao: "propor", meu: $("trMeu").value, para: $("trCom").value, dele: $("trDele").value };
  if (!d.meu || !d.para || !d.dele) return toast("Escolha o seu, o time e o dele.");
  socket.emit("troca", d, (r) => { if (r && !r.ok) toast(r.error); else toast("Proposta enviada!"); });
};
$("hTrocas").onclick = () => host(S.trocas && S.trocas.aberto ? "trocasFechar" : "trocasAbrir");
// esta é a última parte do script: se o estado chegou antes dela, desenha agora
if (S) render();
