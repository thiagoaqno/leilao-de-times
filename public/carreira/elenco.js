// Carreira de Treinador (parte 4): a prancheta. Os 11 no campinho, cada um no lugar em que vai jogar (a mesma conta do
// motor), e o banco com o resto do elenco. Tocar num jogador e depois em outro troca os dois de lugar; tocar num do
// banco e depois num do campo (ou o contrário) põe o reserva no time. Cada mudança é salva na hora, com a escalação
// "fixa": o motor respeita o lugar de cada um (quem estiver machucado ou suspenso dá a vaga para o melhor que sobrou).
// A mesma prancheta serve para a parada tática no meio do jogo (partida.js), com a energia de cada um.
let selecionado = null; // { onde: "campo", i } ou { onde: "banco", pid }

const grupoDe = (pos) => Motor.grupoDe(pos);
const encaixe = (pos, vaga) => Taticas.afinidade(pos, vaga); // 1 = posição dele; menos = improvisado (lateral na zaga, ponta de centroavante...)
const NOME_VAGA = { GOL: "Gol", ZAG: "Zagueiro", LE: "Lat. esq.", LD: "Lat. dir.", VOL: "Volante", MC: "Meio", MEI: "Meia", PE: "Ponta esq.", PD: "Ponta dir.", ATA: "Centroavante", F9: "Falso 9" };

// a energia do jogador (0 a 100): o cansaço dos jogos anteriores; a barra muda de cor quando cai
const nivelEnergia = (e) => (e < 45 ? "baixa" : e < 70 ? "media" : "");
const energiaDe = (pid) => (E.energia && E.energia[pid] != null ? E.energia[pid] : 100);
// a camisa em SVG, com a cor e o desenho do clube (camisas.js); o goleiro joga de verde (ou de laranja se o clube já é verde)
let camisaSeq = 0;
const CORPO_CAMISA = "M20 7 L27 4 Q32 11 37 4 L44 7 L61 18 L54 30 L47 25 L47 59 L17 59 L17 25 L10 30 L3 18 Z";
function camisaSVG(clube, goleiro) {
  let [cam, det, desenho] = camisaDoClube(clube);
  if (goleiro) { cam = distanciaCor("#1fa35a", cam) > 110 ? "#1fa35a" : "#f28c28"; det = "#0c3b22"; desenho = ""; }
  const id = `cm${++camisaSeq}`, cw = 58 / 12;
  const faixas = { l: [2, 6, 10].map((c) => `<rect x="${(3 + c * cw).toFixed(1)}" y="0" width="${(2 * cw).toFixed(1)}" height="64"/>`).join(""),
    h: [0, 1, 2, 3, 4].map((k) => `<rect x="0" y="${9 + 12 * k}" width="64" height="6"/>`).join(""),
    c: `<rect x="29" y="0" width="6" height="64"/>`, f: `<rect x="0" y="44" width="64" height="7"/>`,
    d: `<polygon points="12,64 28,64 64,12 64,0 54,0"/>`, m: `<rect x="32" y="0" width="32" height="64"/>`,
    x: [0, 1, 2, 3, 4].flatMap((i) => [0, 1, 2, 3].filter((j) => (i + j) % 2).map((j) => `<rect x="${3 + i * 11.6}" y="${4 + j * 14}" width="11.6" height="14"/>`)).join("") }[desenho] || "";
  return `<svg class="camisa" viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="${id}"><path d="${CORPO_CAMISA}"/></clipPath></defs>
    <g clip-path="url(#${id})"><rect width="64" height="64" fill="${cam}"/><g fill="${det}">${faixas}</g><path d="M3 18 L10 30 L17 25 L17 59 L24 59 L24 14 Z" fill="#00000026"/><path d="M61 18 L54 30 L47 25 L47 59 L40 59 L40 14 Z" fill="#0000001f"/><path d="M27 4 Q32 11 37 4 L37 14 L27 14 Z" fill="#ffffff22"/></g>
    <path d="M27 4 Q32 11 37 4" fill="none" stroke="${det}" stroke-width="2.2" stroke-linecap="round"/><path d="${CORPO_CAMISA}" fill="none" stroke="#000000a6" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
}
// o gramado em perspectiva (uma vista de cima inclinada): o fundo é desenhado com a mesma conta que põe cada jogador
const PERSPECTIVA = (x, y) => ({ x: 50 + (x - 50) * (0.78 + 0.22 * y / 100), y: 4 + 0.94 * y }); // x e y de 0 a 100 no campo → % da caixa
const RELVA = (() => {
  const pt = (x, y) => { const p = PERSPECTIVA(x, y); return `${p.x.toFixed(2)},${(p.y * 0.88).toFixed(2)}`; };
  const poli = (pontos, classe) => `<polygon class="${classe}" points="${pontos.map(([x, y]) => pt(x, y)).join(" ")}"/>`;
  const faixas = Array.from({ length: 8 }, (_, k) => poli([[0, k * 12.5], [100, k * 12.5], [100, (k + 1) * 12.5], [0, (k + 1) * 12.5]], k % 2 ? "fb" : "fa")).join("");
  const linha = (pontos) => `<polyline class="ln" points="${pontos.map(([x, y]) => pt(x, y)).join(" ")}"/>`;
  const elipse = Array.from({ length: 41 }, (_, k) => [50 + 14 * Math.cos(k / 40 * 2 * Math.PI), 50 + 9.5 * Math.sin(k / 40 * 2 * Math.PI)]);
  const caixa = (x0, x1, y0, y1) => linha([[x0, y0], [x0, y1], [x1, y1], [x1, y0]]);
  return `<svg class="relva" viewBox="0 0 100 88" preserveAspectRatio="none" aria-hidden="true">${faixas}${linha([[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]])}${linha([[0, 50], [100, 50]])}${linha(elipse)}
    ${caixa(20, 80, 100, 84)}${caixa(36, 64, 100, 94.5)}${caixa(20, 80, 0, 16)}${caixa(36, 64, 0, 5.5)}</svg>`;
})();
// a posição da vaga no campo da tela (em %) e o tamanho da peça: quem está mais perto (embaixo) aparece maior
const lugarNoCampo = (s) => { const p = PERSPECTIVA(s.x, s.y); return { x: p.x, y: p.y, e: 0.86 + 0.14 * s.y / 100 }; };
const POS_COR = { GOL: "#f59e0b", DEF: "#60a5fa", MEI: "#4ade80", ATA: "#f87171" };
const marcaPos = (pos) => `<i class="ponto" style="background:${POS_COR[GRUPO_TELA[pos]] || "#4ade80"}"></i>`;
// o campinho: as camisas nas posições da formação (o gol embaixo, o ataque em cima)
function campinho(detalhe, formacao, opcoes = {}) {
  const spots = Taticas.spots(formacao);
  return `<div class="gramado">${RELVA}${detalhe.map((v, i) => {
    const s = spots[i]; if (!s) return "";
    const l = lugarNoCampo(s), estilo = `left:${l.x.toFixed(2)}%;top:${l.y.toFixed(2)}%;--e:${l.e.toFixed(3)}`;
    if (!v.id) return `<button class="peca vazia" data-i="${i}" style="${estilo}"><span class="cam"><span class="sem">?</span></span><small>${NOME_VAGA[v.fino] || v.fino}</small></button>`;
    const j = JOGADORES[v.id], fit = encaixe(j.pos, v.fino), energia = opcoes.energia ? opcoes.energia[v.id] : null;
    const nota = notaDe(j), cansaco = opcoes.energia ? penalidadeSequencia(v.id) : 0, rendimento = Math.round((nota - cansaco) * fit);
    const sel = opcoes.selecionado === i;
    return `<button class="peca ${faixa(nota)}${sel ? " sel" : ""}${fit < 1 ? " improvisado" : ""}" data-i="${i}" data-jogador="${v.id}" data-nota="${nota}" data-rendimento="${rendimento}" data-fit="${fit}" style="${estilo}" title="${h(j.nome)} · ${POS_NOME[j.pos] || j.pos}${fit < 1 ? ` · rende ${rendimento} nesta faixa do campo` : ""} · energia ${energia ?? 100}% · ${sequenciaDe(v.id)} jogos seguidos${cansaco ? ` · over -${cansaco}` : ""}">
      ${cansaco ? `<span class="cansaco-canto" title="${sequenciaDe(v.id)} jogos seguidos: over -${cansaco}">-${cansaco}</span>` : ""}
      <span class="peca-mudancas">${seloMudancaNota(v.id)}${seloEfeitoNota(v.id)}</span>
      <span class="cam">${camisaSVG(donoDe(v.id), v.fino === "GOL")}<span class="nota-em-campo"><b>${nota}</b>${rendimento !== nota ? `<em>→ ${rendimento}</em>` : ""}</span></span>
      ${energia != null ? `<span class="energia ${nivelEnergia(energia)}" title="Energia ${energia}%"><i style="--v:${energia}%"></i></span>` : ""}<small>${h(sobrenome(j.nome))}</small></button>`;
  }).join("")}</div>`;
}

// o cartão do jogador em destaque (o que está marcado ou sob o mouse): a foto, a nota e o gráfico dos seis atributos
let focoElenco = null;
const EIXOS_RADAR = [["rit", "Ritmo"], ["fin", "Finalização"], ["pas", "Passe"], ["dri", "Drible"], ["def", "Defesa"], ["fis", "Físico"]];
function radarSVG(j, pid) {
  const cx = 130, cy = 76, R = 46, bonus = (E.bonusNota && E.bonusNota[pid]) || 0;
  const ponto = (k, f) => { const a = -Math.PI / 2 + k * Math.PI / 3; return [cx + R * f * Math.cos(a), cy + R * f * Math.sin(a)]; };
  const valores = EIXOS_RADAR.map(([k]) => Math.max(20, Math.min(99, (k === "def" && j.pos === "GOL" ? j.atr.gol : j.atr[k]) + bonus)));
  const rede = [0.5, 1].map((f) => `<polygon points="${EIXOS_RADAR.map((_, k) => ponto(k, f).map((n) => n.toFixed(1)).join(",")).join(" ")}" class="rd-rede"/>`).join("");
  const eixos = EIXOS_RADAR.map((_, k) => `<line x1="${cx}" y1="${cy}" x2="${ponto(k, 1)[0].toFixed(1)}" y2="${ponto(k, 1)[1].toFixed(1)}" class="rd-rede"/>`).join("");
  const forma = valores.map((v, k) => ponto(k, v / 99).map((n) => n.toFixed(1)).join(",")).join(" ");
  const rotulos = EIXOS_RADAR.map(([, nome], k) => { const [x, y] = ponto(k, 1.32), ancora = k === 0 || k === 3 ? "middle" : k < 3 ? "start" : "end";
    return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${ancora}" class="rd-rotulo">${k === 4 && j.pos === "GOL" ? "Goleiro" : nome} <tspan class="rd-valor">${valores[k]}</tspan></text>`; }).join("");
  return `<svg class="radar" viewBox="0 0 260 152" role="img" aria-label="Atributos de ${h(j.nome)}">${rede}${eixos}<polygon points="${forma}" class="rd-forma"/>${rotulos}</svg>`;
}
function destaqueHTML(pid) {
  const j = pid && JOGADORES[pid]; if (!j) return `<p class="suave dest-vazio">Toque num jogador para ver o cartão dele.</p>`;
  const nota = notaDe(j), energia = energiaDe(pid), clube = donoDe(pid);
  return `<div class="destaque ${faixa(nota)}"><div class="dest-foto"><span class="dest-pos">${marcaPos(j.pos)}${j.pos}</span><img class="pix" src="${retrato(pid)}" alt=""><b class="dest-nota">${nota}</b></div>
    <div class="dest-nome"><strong>${h(sobrenome(j.nome))}</strong><small>${h(POS_NOME[j.pos] || j.pos)} · ${Evolucao.idadeNa(j, E.temporada)} anos · ${h((CLUBES[clube] || {}).nome || "")}</small>
    <span class="energia ${nivelEnergia(energia)}" title="Energia ${energia}%"><i style="--v:${energia}%"></i></span></div>
    <div class="dest-radar">${radarSVG(j, pid)}</div></div>`;
}
// o jogador do cartão: o marcado, ou o último sob o mouse, ou o melhor titular
const pidDestaque = (detalhe, marcado) => (marcado && JOGADORES[marcado] ? marcado : focoElenco && JOGADORES[focoElenco] && E.elenco.includes(focoElenco) ? focoElenco
  : detalhe.filter((v) => v.id).sort((a, b) => notaDe(JOGADORES[b.id]) - notaDe(JOGADORES[a.id]))[0]?.id);
document.addEventListener("pointerover", (e) => {
  const b = e.target.closest(".peca[data-jogador], .reserva[data-jogador]"); if (!b) return;
  const caixa = b.closest("#elenco, #dCorpo")?.querySelector(".destaque-box"); if (!caixa || caixa.dataset.pid === b.dataset.jogador) return;
  focoElenco = b.dataset.jogador; caixa.dataset.pid = focoElenco; caixa.innerHTML = destaqueHTML(focoElenco);
});
// o cartão de um reserva: a posição, a foto, a nota, o nome e a energia (attrs: o que o chamador precisa, como data-reserva)
function reservaHTML(pid, { sel = false, attrs = "" } = {}) {
  const j = JOGADORES[pid], nota = notaDe(j), cans = penalidadeSequencia(pid), energia = energiaDe(pid), fr = fora(pid);
  return `<button class="reserva ${faixa(nota)}${sel ? " sel" : ""}${fr ? " indisponivel" : ""}" data-jogador="${pid}" ${attrs} title="${h(j.nome)} · ${POS_NOME[j.pos] || j.pos} · energia ${energia}%${fr ? ` · ${fr === "lesao" ? "lesionado" : "suspenso"}` : ""}">
    <span class="res-pos">${marcaPos(j.pos)}${j.pos}</span><img class="pix" src="${retrato(pid)}" alt=""><b class="res-nota">${nota}</b>
    ${cans ? `<span class="cansaco-canto" title="${sequenciaDe(pid)} jogos seguidos: over -${cans}">-${cans}</span>` : ""}
    <span class="res-marcas">${situacao(pid, true)}</span><span class="energia ${nivelEnergia(energia)}"><i style="--v:${energia}%"></i></span><span class="res-nome">${h(sobrenome(j.nome))}</span></button>`;
}

function telaElenco() {
  const t = meuTime(), det = Motor.escalacaoDetalhada(t), esc = E.escalacao;
  const titulares = new Set(det.map((v) => v.id).filter(Boolean));
  $("eDestaque").dataset.pid = pidDestaque(det, selecionado?.onde === "campo" ? det[selecionado.i].id : selecionado?.pid) || "";
  $("eDestaque").innerHTML = destaqueHTML($("eDestaque").dataset.pid);
  $("eCampo").innerHTML = campinho(det, t.formacao, { selecionado: selecionado?.onde === "campo" ? selecionado.i : null, energia: E.energia });
  const comJogador = det.filter((v) => v.id), media = comJogador.reduce((s, v) => s + notaDe(JOGADORES[v.id]), 0) / Math.max(1, titulares.size);
  const mediaPosicao = comJogador.reduce((s, v) => s + (notaDe(JOGADORES[v.id]) - penalidadeSequencia(v.id)) * encaixe(JOGADORES[v.id].pos, v.fino), 0) / Math.max(1, titulares.size);
  const energiaMedia = comJogador.reduce((s, v) => s + energiaDe(v.id), 0) / Math.max(1, comJogador.length);
  const improvisados = det.filter((v) => v.id && encaixe(JOGADORES[v.id].pos, v.fino) < 1).length;
  $("eDica").innerHTML = E.partida ? `${ic("cadeado")} A partida está em andamento: a prancheta volta depois do apito final.`
    : selecionado ? `${ic("troca")} Agora toque em quem vai trocar de lugar com ${h(sobrenome(nomeJogador(selecionado.onde === "campo" ? det[selecionado.i].id : selecionado.pid)))}. Toque de novo para ver a ficha.`
    : `${ic("dedo")} Toque num jogador e depois em outro para trocar os dois de lugar. Um jogo no banco recupera 80 de energia e zera a sequência.`;
  $("eForca").innerHTML = `Média dos titulares: <b>${media.toFixed(1)}</b> · energia: <b class="${energiaMedia < 70 ? "aviso-txt" : ""}">${Math.round(energiaMedia)}%</b> · rendimento nas posições: <b class="${mediaPosicao < media - 0.05 ? "aviso-txt" : ""}">${mediaPosicao.toFixed(1)}</b>${improvisados ? ` · <span class="aviso-txt">${improvisados} improvisado${improvisados > 1 ? "s" : ""}</span>` : ""}${efeitoDe("time") ? ` · time ${sinalDe(efeitoDe("time"))} no próximo jogo` : ""}${esc.fixo ? " · escalação sua" : " · escalação automática"}`;
  // os controles
  const seg = (id, lista, atual, chave) => { $(id).innerHTML = lista.map(([v, t]) => `<button data-${chave}="${v}" aria-pressed="${String(v) === String(atual)}">${t}</button>`).join(""); };
  // o esquema (4-3-3, 4-2-3-1...) e, embaixo, as variações dele (1 volante e 2 meias, 2 volantes e 1 meia...)
  const esquema = Taticas.baseDe(esc.formacao), variacoes = Taticas.variacoesDe(esquema);
  seg("eFormacao", Taticas.ESQUEMAS.map((e) => [e, e]), esquema, "esquema");
  seg("eVariacao", variacoes.map((f) => [f, Taticas.ROTULO_FORMACAO[f]]), esc.formacao, "formacao");
  $("eVariacao").previousElementSibling.classList.toggle("hidden", variacoes.length < 2); $("eVariacao").classList.toggle("hidden", variacoes.length < 2);
  $("eFormacaoInfo").textContent = Taticas.DESCRICAO_FORMACAO[esc.formacao] || "";
  seg("eMentalidade", MENTALIDADE.map((t, i) => [i - 2, t]), esc.tatica.mentalidade, "mentalidade");
  seg("ePressao", NIVEL.map((t, i) => [i, t]), esc.tatica.pressao, "pressao");
  seg("eLinha", NIVEL.map((t, i) => [i, t]), esc.tatica.linha, "linha");
  // o que cada opção muda (title) e o painel com as contas do que está escolhido
  const tat = { ...esc.tatica, estilo: esc.tatica.estilo || "equilibrado" };
  for (const [id, chave] of [["eMentalidade", "mentalidade"], ["ePressao", "pressao"], ["eLinha", "linha"]]) for (const b of $(id).querySelectorAll("button")) b.title = dicaDaOpcao(tat, chave, +b.dataset[chave], t);
  $("eEstilo").innerHTML = estiloHTML(tat, t);
  $("eEfeitos").innerHTML = chipsDeEfeito(efeitosDaTatica(tat, t).ef);
  $("eAuto").disabled = !esc.fixo && !esc.titulares;
  // o banco: o resto do elenco, por posição
  const ordem = ["GOL", "ZAG", "LD", "LE", "VOL", "MC", "MEI", "PE", "PD", "ATA"];
  const reservas = E.elenco.filter((pid) => !titulares.has(pid)).sort((a, b) => ordem.indexOf(JOGADORES[a].pos) - ordem.indexOf(JOGADORES[b].pos) || notaDe(JOGADORES[b]) - notaDe(JOGADORES[a]));
  $("eContagem").textContent = `${E.elenco.length} no elenco`;
  $("eBanco").innerHTML = reservas.map((pid) => reservaHTML(pid, { sel: selecionado?.onde === "banco" && selecionado.pid === pid })).join("");
}
async function salvarEscalacao(dados, movimento = {}) {
  const antes = AnimacoesCarreira.capturarEscalacao();
  const r = await pedir("escalacao", dados);
  if (!r.ok) { toast(r.error); return false; }
  receber(r.estado); AnimacoesCarreira.animarEscalacao(antes, movimento); return true;
}
// tocar no campo e no banco
$("eCampo").addEventListener("click", async (e) => {
  const b = e.target.closest(".peca"); if (!b || E.partida) return;
  const i = +b.dataset.i, det = Motor.escalacaoDetalhada(meuTime()), ids = det.map((v) => v.id);
  if (selecionado?.onde === "campo" && selecionado.i === i) { selecionado = null; if (ids[i]) abrirFicha(ids[i]); return telaElenco(); }
  let envolvidos = [];
  if (selecionado?.onde === "campo") { envolvidos = [ids[i], ids[selecionado.i]]; [ids[i], ids[selecionado.i]] = [ids[selecionado.i], ids[i]]; selecionado = null; }
  else if (selecionado?.onde === "banco") { envolvidos = [ids[i], selecionado.pid]; ids[i] = selecionado.pid; selecionado = null; }
  else { selecionado = { onde: "campo", i }; return telaElenco(); }
  if (ids.some((x) => !x)) { telaElenco(); return toast("Falta gente para completar os 11."); }
  await salvarEscalacao({ titulares: ids, fixo: true }, { tipo: "troca", envolvidos });
});
$("eBanco").addEventListener("click", async (e) => {
  const f = e.target.closest(".reserva"); if (!f || E.partida) return;
  const pid = f.dataset.jogador;
  if (selecionado?.onde === "banco" && selecionado.pid === pid) { selecionado = null; telaElenco(); return abrirFicha(pid); }
  if (selecionado?.onde === "campo") {
    const ids = Motor.escalacaoDetalhada(meuTime()).map((v) => v.id), i = selecionado.i;
    selecionado = null;
    if (fora(pid)) { telaElenco(); return toast(`${nomeJogador(pid)} não pode jogar (${fora(pid) === "lesao" ? "lesionado" : "suspenso"}).`); }
    ids[i] = pid;
    if (ids.some((x) => !x)) { telaElenco(); return toast("Falta gente para completar os 11."); }
    return salvarEscalacao({ titulares: ids, fixo: true }, { tipo: "troca", envolvidos: [pid] });
  }
  selecionado = { onde: "banco", pid }; telaElenco();
});
// formação e tática
document.addEventListener("click", async (e) => {
  const b = e.target.closest("#elenco [data-formacao], #elenco [data-esquema], #elenco [data-mentalidade], #elenco [data-pressao], #elenco [data-linha], #elenco [data-estilo]"); if (!b || E.partida) return;
  const esc = E.escalacao;
  if (b.dataset.formacao || b.dataset.esquema) {
    // trocar de esquema vai para a variação padrão dele (o nome do esquema); os mesmos 11 e o motor acha o melhor lugar de cada um
    const formacao = b.dataset.formacao || b.dataset.esquema;
    const ids = Motor.escalacaoDetalhada(meuTime()).map((v) => v.id).filter(Boolean);
    selecionado = null;
    return salvarEscalacao(ids.length === 11 && esc.titulares ? { formacao, titulares: ids, fixo: false } : { formacao }, { tipo: "formacao" });
  }
  if (b.dataset.estilo) return salvarEscalacao({ tatica: { ...esc.tatica, estilo: b.dataset.estilo } });
  const k = ["mentalidade", "pressao", "linha"].find((x) => b.dataset[x] != null);
  salvarEscalacao({ tatica: { ...esc.tatica, [k]: +b.dataset[k] } });
});
$("eAuto").onclick = () => { selecionado = null; salvarEscalacao({ titulares: null }, { tipo: "formacao" }); };
