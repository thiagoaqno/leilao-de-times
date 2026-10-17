// A luta com o Pokémon selvagem da grama alta da Vila (S.selvagem; o servidor é criarSelvagem em ginasio.js).
// - Na sala: o quadro do selvagem (#selvagemBox) no lugar das opções da partida.
// - Na luta: o botão da Pokébola (#btnPokebola, tecla B) com a chance ao vivo (Niveis.chanceDeCaptura: sobe com a vida
//   baixa e com o Pokémon tonto). O servidor decide e pausa a luta; aqui toca a cena 2D (captura2d.js) por cima da
//   arena, da posição do meu Pokémon até o selvagem, que some enquanto está na bola (visualDe(id).naBola).
// - No fim: o que aconteceu (capturou, venceu ou ele escapou) e a experiência de cada Pokémon que lutou, com o nível
//   que subiu e a evolução; o botão volta para a grama alta da Vila.
const SELVAGEM = { botao: null };
const ehSelvagem = () => !!S?.selvagem;
const spriteDoSelvagem = (id, brilhante) => { const u = PokeDex.sprite(id); return brilhante ? u.replace(/\/(\d+)\.png$/, "/shiny/$1.png") : u; };
const corDaRaridade = (r) => ({ comum: "#9aa8a3", incomum: "#4fbf6a", raro: "#3f8fe0", epico: "#b45cf0", lendario: "#f0b429" })[r] || "#ffd84a";
const NOME_RARIDADE = { comum: "Comum", incomum: "Incomum", raro: "Raro", epico: "Épico", lendario: "Lendário" };

// o quadro do selvagem na sala
function desenharSelvagem() {
  const box = $("selvagemBox"), sv = S?.selvagem;
  box.classList.toggle("hidden", !sv);
  $("opcoes").classList.toggle("hidden", !!sv);
  if (!sv) return;
  const m = PokeDex.MONS[sv.bicho];
  const html = `<div class="selvagem-cartao" style="--r:${corDaRaridade(sv.raridade)}"><img src="${h(spriteDoSelvagem(sv.bicho, sv.brilhante))}" alt="" width="72" height="72">
    <div><span class="tipo-lider">Pokémon selvagem · ${h(NOME_RARIDADE[sv.raridade] || "")}</span><h2>${h(m.n)}${sv.brilhante ? " ✨" : ""} <small>Nv ${sv.nivel}</small></h2>
    <p>${sv.usado ? "Essa luta acabou. Volte para a grama alta para achar outro." : "Enfraqueça ele e jogue a Pokébola (B): quanto menos vida, mais fácil. Vencendo, quem lutou ganha experiência."}</p></div></div>`;
  if (box._h !== html) { box._h = html; box.innerHTML = html; }
}
socket.on("state", () => { desenharSelvagem(); if (SELVAGEM.botao) SELVAGEM.botao.classList.toggle("hidden", !ehSelvagem() || meuJogador()?.lado !== 0); });

// o botão da Pokébola, ao lado da esquiva e da guarda
function montarBotaoPokebola() {
  if (SELVAGEM.botao) return;
  const b = document.createElement("button");
  b.id = "btnPokebola"; b.className = "habilidade esquiva pokebola hidden"; b.title = "Pokébola (B)"; b.setAttribute("aria-label", "Jogar a Pokébola");
  b.innerHTML = `<span class="ic bola" aria-hidden="true"></span><span class="nome">Pokébola</span><kbd>B</kbd><i class="recarga"></i><span class="segundos"></span>`;
  b.onclick = jogarPokebolaNaLuta;
  // no celular, o painel some: o botão flutua na arena; no computador, ganha uma linha só dele no painel
  if (toque) { b.classList.add("flutuante"); $("quadra").appendChild(b); } else $("hud").appendChild(b);

  SELVAGEM.botao = b;
}
montarBotaoPokebola();
// a chance agora, pelo pacote (a vida e o tonto do selvagem)
function chanceAgora() {
  const sel = N.snap?.entidades.find((e) => e.lado === 1);
  if (!sel || !sel.campo || sel.hp <= 0) return null;
  return Niveis.chanceDeCaptura({ bicho: sel.bicho, hp: sel.hp, max: sel.max, tonto: sel.atordoado > 0 });
}
function atualizarBotaoPokebola() {
  const b = SELVAGEM.botao;
  if (!b) return;
  const ativo = ehSelvagem() && S.phase === "play" && meuJogador()?.lado === 0;
  b.classList.toggle("hidden", !ativo);
  if (!ativo) return;
  const c = chanceAgora(), rolando = performance.now() < capturaAte;
  b.disabled = c == null || rolando || SELVAGEM.esperando;
  const txt = c == null ? "Desmaiou" : `Pokébola ${Niveis.porcento(c)}`;
  const nome = b.querySelector(".nome"); if (nome.textContent !== txt) nome.textContent = txt;
  b.style.setProperty("--chance", c == null ? 0 : c.toFixed(3));
}
async function jogarPokebolaNaLuta() {
  if (!ehSelvagem() || SELVAGEM.esperando || performance.now() < capturaAte) return;
  SELVAGEM.esperando = true;
  await act("pokebola");
  SELVAGEM.esperando = false;
}
document.addEventListener("keydown", (e) => { if (e.code === "KeyB" && !e.repeat && podeComandar() && ehSelvagem()) { e.preventDefault(); jogarPokebolaNaLuta(); } });

// a cena da Pokébola, no ponto da tela de cada um
function pontoNaPagina(x, y, altura = 0) {
  const p = pontoTela(x, y, altura), r = cv.getBoundingClientRect();
  return { x: r.left + (p.x * r.width) / cv.width, y: r.top + (p.y * r.height) / cv.height };
}
socket.on("ev", (lista) => {
  for (const ev of lista) {
    if (ev.tipo !== "pokebola") continue;
    capturaAte = performance.now() + ev.dur; limparControles();
    const alvo = N.snap?.entidades.find((e) => e.id === ev.em), eu = N.snap?.entidades.find((e) => e.id === ev.de);
    const r = cv.getBoundingClientRect(), escala = (escalaEm(ev.x, ev.y) * r.width) / cv.width, tamanho = Math.max(48, escala * 1.6);
    const ponto = pontoNaPagina(ev.x, ev.y, 0.8);
    const de = eu ? pontoNaPagina(eu.x, eu.y, 0.9) : { x: r.left + r.width * 0.15, y: r.top + r.height * 0.8 };
    const sv = S?.selvagem;
    Captura2D.tocar({
      de, alvo: ponto, tamanho, sprite: alvo ? spriteDoSelvagem(alvo.forma || alvo.bicho, sv?.brilhante) : null, cor: corDaRaridade(sv?.raridade),
      balancos: ev.balancos, pegou: ev.pegou, chance: ev.chance, chanceTexto: Niveis.porcento(ev.chance), tempos: Niveis.TEMPOS_DA_BOLA, som: somLigado,
      aoEsconder: () => { visualDe(ev.em).naBola = true; }, aoMostrar: () => { visualDe(ev.em).naBola = false; },
    });
  }
});

// o fim da luta: capturou, venceu (a experiência de cada um) ou ele escapou
const mostrarResultadoDoGinasio = mostrarResultado;
mostrarResultado = function () {
  mostrarResultadoDoGinasio();
  const sel = S.results?.selvagem, box = $("resultadoSelvagem");
  box.classList.toggle("hidden", !sel);
  $("btnVila").classList.toggle("hidden", !sel);
  $("btnRevanche").classList.toggle("hidden", !!sel || S.host !== ME?.id);
  $("btnLobby").classList.toggle("hidden", !!sel);
  if (!sel) return;
  const n = (id) => h(PokeDex.MONS[id]?.n || id);
  $("resultadoTitulo").textContent = sel.capturado ? `${PokeDex.MONS[sel.bicho].n} capturado!` : sel.derrotado ? `Você venceu ${PokeDex.MONS[sel.bicho].n}!` : S.results.vencedor === 1 ? `${PokeDex.MONS[sel.bicho].n} venceu a luta` : `${PokeDex.MONS[sel.bicho].n} escapou`;
  const linhas = sel.xp.map((x) => {
    const pct = Number.isFinite(x.falta) && x.falta > 0 ? Math.round((x.xp / x.falta) * 100) : 100;
    const ev = x.evolucoes.length ? `<strong class="evoluiu">evoluiu para ${x.evolucoes.map((e) => n(e.para)).join(" e depois ")}!</strong>` : "";
    return `<li><img src="${h(spriteDoSelvagem(x.para))}" alt="" width="48" height="48"><div><b>${n(x.bicho)}</b> +${x.ganho} de experiência · Nv ${x.nivelAntes}${x.nivel > x.nivelAntes ? ` → <b>${x.nivel}</b>` : ""} ${ev}<span class="xpbarra"><i style="width:${pct}%"></i></span></div></li>`;
  }).join("");
  box.innerHTML = `<p>${sel.capturado ? `Foi para a sua Pokédex no nível ${sel.nivel}${sel.bolas > 1 ? `, na ${sel.bolas}ª Pokébola` : ""}.` : sel.derrotado ? "Ele desmaiou: não dá mais para capturar, mas quem lutou ganhou experiência." : "Sem experiência desta vez. Ele estava forte demais? Treine com os mais fracos primeiro."}</p>${linhas ? `<ul class="xp-lista">${linhas}</ul>` : ""}`;
};

// a cada quadro (o botão)
(function laco() { atualizarBotaoPokebola(); requestAnimationFrame(laco); })();
