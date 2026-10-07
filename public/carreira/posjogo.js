// Carreira de Treinador: o pós-jogo. Quando a sua partida acaba, o que mexeu no time aparece num pop-up, um cartão
// depois do outro: o placar, a moral (o medidor anda do valor de antes ao de agora), o dinheiro da rodada (contando),
// os desfalques, os efeitos que passaram a valer e os eventos novos, que dá para responder ali mesmo. Aparece uma vez
// por rodada (carreira:posjogo guarda a última vista). Quem pede "menos movimento" vê tudo pronto, sem animação.
const quietoPJ = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const chavePJ = (p) => `${E.clube}:${E.temporada}:${p.rodada}`;
function mostrarPosJogo(forcar = false) {
  const p = E && E.posJogo;
  if (!p || E.partida || $("posJogo").open) return;
  if (!forcar && store.get("carreira:posjogo") === chavePJ(p)) return;
  store.set("carreira:posjogo", chavePJ(p));
  desenharPosJogo(p);
  $("posJogo").showModal();
  animarPosJogo();
}
const RESULTADO_PJ = { V: ["Vitória", "bom"], E: ["Empate", "neutro"], D: ["Derrota", "ruim"] };
function desenharPosJogo(p) {
  const [nome, humorPJ] = RESULTADO_PJ[p.resultado], dm = p.moral[1] - p.moral[0], dc = p.caixa[1] - p.caixa[0];
  const eventos = p.eventos.map((id) => E.caixaEntrada.find((e) => e.id === id)).filter((e) => e && !e.resolvido);
  const avisos = p.avisos.map((id) => E.caixaEntrada.find((e) => e.id === id)).filter(Boolean).slice(0, 4);
  const desfalques = [...p.lesoes.map(([pid, n]) => [pid, `Lesão · fora ${n} rod.`, "ruim"]), ...p.suspensos.map((pid) => [pid, "Suspenso", "ruim"]), ...p.pendurados.map((pid) => [pid, "Pendurado (2 amarelos)", "aviso"])];
  let i = 0; const cartao = (cls, html) => `<section class="pj-cartao ${cls}" style="--i:${i++}">${html}</section>`;
  const sinal = (v) => (v > 0 ? "+" : v < 0 ? "−" : "");
  $("pjCorpo").innerHTML = `
    <h2 id="pjTitulo" class="pj-titulo">Pós-jogo · Rodada ${p.rodada + 1}</h2>
    ${cartao(`pj-placar ${humorPJ}`, `<div class="pj-times">${escudo(p.casa, 3)}<span class="pj-gols">${p.placar[0]}<i>×</i>${p.placar[1]}</span>${escudo(p.fora, 3)}</div><b class="pj-resultado">${nome}</b>`)}
    <div class="pj-grade">
      ${cartao("pj-moral", `<h3>${ic(dm >= 0 ? "sobe" : "baixo")} Moral</h3><div class="pj-medidor"><i style="--de:${p.moral[0]}%;--para:${p.moral[1]}%"></i></div>
        <p><b class="${dm > 0 ? "positivo" : dm < 0 ? "neg" : ""}">${sinal(dm)}${Math.abs(dm)}</b> · agora ${humor(p.moral[1])}</p>`)}
      ${cartao("pj-dinheiro", `<h3>${ic("moeda")} Dinheiro da rodada</h3><ul class="extrato">${p.financas.map(([n, v]) => `<li><span>${h(n)}</span><b class="${v < 0 ? "neg" : "positivo"}" data-conta="${v}">${dinheiro(v)}</b></li>`).join("") || "<li class='suave'>Nada entrou nem saiu.</li>"}</ul>
        <p class="pj-caixa">Caixa: <b data-conta="${p.caixa[1]}" data-de="${p.caixa[0]}">${dinheiro(p.caixa[1])}</b> <small class="${dc >= 0 ? "positivo" : "neg"}">(${dc >= 0 ? "+" : ""}${dinheiro(dc)})</small></p>`)}
    </div>
    ${desfalques.length ? cartao("pj-desfalques", `<h3>${ic("alerta")} Desfalques</h3><div class="pj-figurinhas">${desfalques.map(([pid, txt, c]) => `<div>${figurinha(pid)}<span class="tag ${c}">${h(txt)}</span></div>`).join("")}</div>`) : ""}
    ${p.efeitos.length ? cartao("pj-efeitos", `<h3>${ic("raio")} Passou a valer</h3><ul class="efeitos">${p.efeitos.map((e) => {
      const bom = e.alvo === "rival" ? e.nota < 0 : e.nota > 0, quem = e.alvo === "time" ? "Time" : e.alvo === "rival" ? "Próximo adversário" : sobrenome(nomeJogador(e.alvo));
      return `<li class="${bom ? "bom" : "ruim"}">${ic(bom ? "sobe" : "baixo")}<b>${h(quem)} ${e.nota > 0 ? "+" : ""}${e.nota}</b><small>${e.ate > e.de ? `${e.ate - e.de + 1} jogos` : "1 jogo"}</small></li>`;
    }).join("")}</ul>`) : ""}
    ${eventos.length ? cartao("pj-eventos", `<h3>${ic("sino")} Chegou na caixa de entrada</h3>${eventos.map((e) => `<div class="pj-evento" data-ev="${h(e.id)}"><b>${h(e.titulo)}</b><p>${h(e.texto)}</p>
      <div class="opcoes-evento">${e.tipo === "disputa" ? `<button data-disputa="${h(e.id)}">${ic("martelo")} Abrir a disputa</button>` : e.opcoes.map((o) => `<button data-pj-ev="${h(e.id)}" data-opcao="${h(o.id)}" class="${o.id === e.padrao ? "" : "secundario"}">${h(o.nome)}</button>`).join("")}</div></div>`).join("")}`) : ""}
    ${avisos.length ? cartao("pj-avisos", `<h3>${ic("lista")} Também aconteceu</h3><ul>${avisos.map((e) => `<li><b>${h(e.titulo)}</b>${e.resultado ? ` · ${h(e.resultado)}` : ""}</li>`).join("")}</ul>`) : ""}
    <button id="pjContinuar" class="primario largo" style="--i:${i}">Continuar</button>`;
  $("pjContinuar").onclick = () => $("posJogo").close();
  for (const b of $("pjCorpo").querySelectorAll("[data-pj-ev]")) b.onclick = async () => {
    for (const x of b.parentElement.querySelectorAll("button")) x.disabled = true;
    const r = await pedir("evento", { id: b.dataset.pjEv, opcao: b.dataset.opcao });
    if (!r.ok) { toast(r.error); for (const x of b.parentElement.querySelectorAll("button")) x.disabled = false; return; }
    receber(r.estado);
    const caixa = b.closest(".pj-evento"); caixa.classList.add("respondido");
    caixa.querySelector(".opcoes-evento").innerHTML = `<p class="resultado">${h(r.mensagem || "Feito.")}</p>`;
  };
  for (const b of $("pjCorpo").querySelectorAll("[data-disputa]")) b.onclick = () => { $("posJogo").close(); abrirDisputa(b.dataset.disputa); };
}
// os números contando e o medidor andando (uma vez, quando o pop-up abre)
function animarPosJogo() {
  if (quietoPJ()) return;
  const caixa = $("pjCorpo").querySelector(".pj-caixa [data-conta]"), linhas = [...$("pjCorpo").querySelectorAll(".extrato [data-conta]")];
  const conta = (el, de, para, atraso, dur = 700) => {
    let t0 = 0; el.textContent = dinheiro(de);
    const anda = (agora) => { if (!t0) t0 = agora + atraso; const f = Math.max(0, Math.min(1, (agora - t0) / dur)); el.textContent = dinheiro(Math.round(de + (para - de) * (1 - Math.pow(1 - f, 3)))); if (f < 1 && el.isConnected) requestAnimationFrame(anda); };
    requestAnimationFrame(anda);
  };
  linhas.forEach((el, k) => conta(el, 0, +el.dataset.conta, 350 + k * 110, 500));
  if (caixa) conta(caixa, +caixa.dataset.de, +caixa.dataset.conta, 450 + linhas.length * 110, 800);
}
$("posJogo").addEventListener("close", () => { if (telaAtual === "sede") desenharTela("sede"); });
