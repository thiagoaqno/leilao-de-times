// Barras e botoes preservam os elementos entre pacotes; so os valores mudam.
let chaveHud = "", ultimoQuadro = performance.now();
const iconeHabilidade = (hab) => hab.classe === "cura" ? "mais" : ["reforco", "escudo", "tambor"].includes(hab.classe) ? "escudo" : hab.classe === "investida" ? "raio" : hab.classe === "corpo" ? "espadas" : hab.tipo === "Fogo" ? "fogo" : "explosao";
function montarHud() {
  const e = N.snap?.entidades.find((p) => p.id === ME?.id), chave = e ? `${N.inicio}:${e.forma}:${e.ativo}` : "";
  if (chave === chaveHud) return;
  chaveHud = chave;
  if (!e) return;
  const D = dexAtual(), mon = D.MONS[e.forma || e.bicho];
  preencher("habilidades", mon.moves.map((id, i) => {
    const mv = D.MOVES[id], hab = Ginasio.habilidadeDeGolpe(id, mv);
    const custo = modoAtual() === "naruto" ? ` · ${mv.custo || 0} chakra` : "";
    return `<button class="habilidade" data-golpe="${i}" style="--tipo:${D.TYPES[mv.t]}" title="${h(mv.n + custo)}" aria-label="${h(mv.n + custo)}">${ic(iconeHabilidade(hab))}<span class="nome">${h(mv.n)}</span><i class="recarga"></i><span class="segundos"></span></button>`;
  }).join(""));
  preencher("reservas", e.time.map((b, i) => `<button data-troca="${i}" title="${h(D.MONS[b.id].n)}" aria-label="${h(D.MONS[b.id].n)}"><img src="${h(spriteUrl(b.id))}" alt=""><span class="mini-vida"><i></i></span></button>`).join(""));
  configurarToque();
}
function recargaBotao(b, falta, total) {
  // quando a recarga acaba, a borda acende na cor do tipo por um instante
  const pronto = falta <= 0.05;
  if (pronto && b.dataset.recarregando === "1") { b.classList.add("pronta"); clearTimeout(b._pronta); b._pronta = setTimeout(() => b.classList.remove("pronta"), 220); }
  b.dataset.recarregando = pronto ? "0" : "1";
  b.querySelector(".recarga").style.transform = `scaleY(${clamp(falta / total, 0, 1)})`;
  b.querySelector(".segundos").textContent = falta > 0.05 ? falta.toFixed(1) : "";
  b.setAttribute("aria-disabled", falta > 0.05 ? "true" : "false");
}
function atualizarHud(agora) {
  if (!S?.match || !N.snap) return;
  montarHud();
  const sn = N.snap, delta = S.phase === "play" ? Math.max(0, agora - sn.t) / 1000 : 0;
  const tempo = clamp(S.match.duracao - sn.tempo - delta, 0, S.match.duracao);
  $("relogio").textContent = `${Math.floor(tempo / 60)}:${String(Math.floor(tempo % 60)).padStart(2, "0")}`;
  for (const lado of [0, 1]) {
    const js = S.match.jogadores.filter((p) => p.lado === lado), es = sn.entidades.filter((p) => p.lado === lado);
    $(lado ? "nomeVermelho" : "nomeAzul").textContent = js.map((p) => p.nome).join(" + ");
    const vida = es.reduce((total, e) => total + e.time.reduce((v, b) => v + b.hp / b.max, 0), 0) / (js.length * 3);
    $(lado ? "vidaVermelha" : "vidaAzul").style.transform = `scaleX(${clamp(vida, 0, 1)})`;
  }
  const contagem = S.phase === "play" ? Math.ceil((S.match.start - agora) / 1000) : 0;
  $("contagem").classList.toggle("hidden", contagem <= 0); if (contagem > 0) $("contagem").textContent = contagem;
  const e = sn.entidades.find((p) => p.id === ME?.id); if (!e) return;
  const naruto = modoAtual() === "naruto";
  $("chakraHud").classList.toggle("hidden", !naruto);
  if (naruto) $("chakraHud").textContent = `◈ Chakra ${Math.floor(e.chakra)}/100 · Substituições ${e.substitutes}/2`;
  $("btnEsquiva").querySelector(".nome").textContent = naruto ? "Subst." : "Esquiva";
  $("btnEsquiva").title = naruto ? "Substituição · 20 chakra" : "Esquiva";
  $("btnEsquiva").setAttribute("aria-label", $("btnEsquiva").title);
  const mon = dexAtual().MONS[e.forma || e.bicho];
  document.querySelectorAll("#habilidades [data-golpe]").forEach((b) => {
    const i = +b.dataset.golpe, falta = Math.max(0, e.cds[i] - delta), hab = Ginasio.habilidadeDeGolpe(mon.moves[i], dexAtual().MOVES[mon.moves[i]]);
    recargaBotao(b, falta, hab.recarga); b.disabled = !e.campo || !!e.canal || (naruto && e.chakra < (dexAtual().MOVES[mon.moves[i]].custo || 0));
  });
  recargaBotao($("btnEsquiva"), Math.max(0, e.esquivaCd - delta), naruto ? 5 : 3); $("btnEsquiva").disabled = !e.campo || (naruto && (e.substitutes <= 0 || e.chakra < 20));
  document.querySelectorAll("#reservas [data-troca]").forEach((b) => {
    const i = +b.dataset.troca; b.classList.toggle("ativo", i === e.ativo);
    b.disabled = i === e.ativo || e.time[i].hp <= 0 || e.trocaCd > delta || !e.campo;
    b.querySelector(".mini-vida i").style.transform = `scaleX(${e.time[i].hp / e.time[i].max})`;
  });
  if (toque) document.querySelectorAll("#toque [data-habilidade]").forEach((b) => {
    const i = +b.dataset.habilidade, falta = Math.max(0, (i === 4 ? e.esquivaCd : e.cds[i]) - delta);
    const total = i === 4 ? (naruto ? 5 : 3) : Ginasio.habilidadeDeGolpe(mon.moves[i], dexAtual().MOVES[mon.moves[i]]).recarga;
    recargaBotao(b, falta, total); b.disabled = !e.campo || (i === 4 ? naruto && (e.substitutes <= 0 || e.chakra < 20) : !!e.canal || naruto && e.chakra < (dexAtual().MOVES[mon.moves[i]].custo || 0));
  });
}
function mostrarResultado() {
  limparControles(); Toque.show(false);
  const r = S.results, ganhou = r.vencedor === meuJogador()?.lado, lider = Lideres.de(S.config.lider);
  $("resultadoTitulo").textContent = r.empate ? "Empate" : ganhou ? "Vitória!" : ME?.id ? "Fim da batalha" : `Lado ${r.vencedor + 1} venceu`;
  // venceu um líder: a insígnia fica guardada neste navegador
  if (ganhou && lider) {
    if (lider.onde === "ginasio") { const ins = insignias(); const nova = !ins[lider.id]; ins[lider.id] = true; store.set("ginasio:insignias", ins); $("resultadoTitulo").textContent = nova ? `Insígnia ${lider.tipo} conquistada!` : `Você venceu ${lider.nome} de novo!`; mostrarInsignias(); }
    else $("resultadoTitulo").textContent = `Você venceu ${lider.nome}!`;
  }
  $("resultadoLados").innerHTML = r.lados.map((l) => `<div class="resultado-lado"><i class="cor ${l.lado ? "vermelho" : ""}"></i><span>${l.jogadores.map((p) => h(p.nome)).join(" + ")}</span><strong>${Math.round(l.vida / (l.jogadores.length * 3) * 100)}%</strong></div>`).join("");
  $("btnRevanche").classList.toggle("hidden", S.host !== ME?.id); $("resultado").showModal();
}
$("btnEsquiva").innerHTML = `${ic("pular")}<span class="nome">Esquiva</span><i class="recarga"></i><span class="segundos"></span>`;
$("btnEsquiva").onclick = mandarEsquiva;
$("habilidades").onclick = (e) => { const b = e.target.closest("[data-golpe]"); if (b && !b.disabled) mandarGolpe(+b.dataset.golpe); };
$("reservas").onclick = (e) => { const b = e.target.closest("[data-troca]"); if (b && !b.disabled) mandarTroca(+b.dataset.troca); };
$("resultadoFechar").innerHTML = ic("fechar"); $("resultadoFechar").onclick = () => $("resultado").close();
$("btnLobby").onclick = async () => { $("resultado").close(); if (S.host === ME?.id) await act("lobby"); else { salaVisivel = true; mostrarJogo(false); } };
$("btnRevanche").onclick = async () => { $("resultado").close(); if (await act("lobby")) { salaVisivel = false; await act("start"); } };

function quadro(agora) {
  const dt = Math.min(0.05, Math.max(0, (agora - ultimoQuadro) / 1000)); ultimoQuadro = agora;
  if (!document.hidden) {
    prever(dt); desenhar(relogio.agora(), dt); atualizarHud(relogio.agora());
  }
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);
if (location.hash.includes("debug")) window.__ginasio = { get S() { return S; }, get ME() { return ME; }, N, entrada, imagens, animacoes, visuais, poseBicho, camera, cena3d, pontoTela, pontoMundo, movimentoReduzido, efeitos, desenhar, mandarGolpe, mandarEsquiva, mandarTroca, comandoAtual };
socket.connect();
