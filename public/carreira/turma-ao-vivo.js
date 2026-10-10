// Carreira em grupo: a rodada ao vivo para quem não está jogando. Quem não tem jogo na rodada (ou já acabou o seu), e
// quem está na sala sem clube, acompanha os placares: os jogos da turma, com o relógio de cada um, e os outros jogos da
// semana, no relógio da rodada. Na sede fica em #cartaoAoVivo; na tela da sala, em #gAoVivo. Os dados vêm do evento
// "rodada" do servidor (carreira-rodada.js, visao) e daqui só se desenha: o placar sobe quando o relógio passa pelo gol.
// Quando a rodada acaba, os resultados ficam na tela durante a pausa (SALA.liberaEm) e somem depois dela.
const TurmaAoVivo = (() => {
  const TV = { v: null, encerrada: null, chave: "", linhas: [], abertos: new Set() };
  let relogio = null;

  const nomeComp = (id) => (E && E.competicoes && E.competicoes[id] && E.competicoes[id].nome) || Temporada.NOMES[id] || id;
  const tecnicoDe = (clube) => { const p = SALA && SALA.players.find((x) => x.clube === clube); return p ? p.name : null; };
  const golsDe = (o) => o.gols || (o.eventos || []).filter((e) => e.tipo === "gol").map((e) => ({ min: e.min, acr: e.acr, lado: e.lado }));
  const tempo = (g) => g.min + (g.acr ? g.acr / 100 : 0);
  // o minuto de um jogo da turma (o relógio dele, que para nas paradas) e o da rodada (o dos jogos do computador)
  const minutoTurma = (v, o) => {
    const r = o.relogio; if (!r) return 0;
    return Math.min(r.limite, r.minuto + (r.rodando ? Math.max(0, agoraServidor() - Math.max(r.t, v.inicio)) / 1000 * r.vel : 0));
  };
  const minutoRodada = (v) => {
    const r = v.relogio; if (!r) return 0;
    const desde = Math.max(r.t, v.inicio), agora = agoraServidor();
    return Math.min(95, r.minuto + (agora > desde ? (agora - desde) / 1000 * r.vel : 0));
  };
  // quem vê o painel: não tem jogo nesta rodada, ou o dele já acabou
  const assistindo = (v) => !!v && (!v.meu || v.meu.fim);
  const alvo = () => (typeof telaAtual !== "undefined" && telaAtual === "grupo" ? $("gAoVivo") : $("cartaoAoVivo"));

  function montar(v, el) {
    const turma = [...(v.meu ? [v.meu] : []), ...(v.outros || [])].map((o) => ({ ...o, turma: true }));
    const porComp = new Map();
    for (const x of v.paralelos || []) { if (!porComp.has(x.competicao)) porComp.set(x.competicao, []); porComp.get(x.competicao).push(x); }
    const compsTurma = new Set(turma.map((o) => o.competicao));
    const linha = (x) => {
      const tec = x.turma ? [x.casa, x.fora].map(tecnicoDe) : [];
      return `<li class="av-jogo${x.turma ? " tv-turma" : ""}" data-id="${h(x.id)}"${x.turma ? ' data-turma="1"' : ""}><span class="av-time casa"><b>${h(CLUBES[x.casa].curto)}</b>${escudo(x.casa, 1)}</span><span class="av-placar">0 × 0</span><span class="av-time fora">${escudo(x.fora, 1)}<b>${h(CLUBES[x.fora].curto)}</b></span>${tec.some(Boolean) ? `<small class="tv-tec">${h(tec[0] || nomeClube(x.casa))} × ${h(tec[1] || nomeClube(x.fora))}</small>` : ""}<small class="av-min"></small></li>`;
    };
    const secao = (titulo, itens, aberta, id) => `<details class="tv-secao" data-sec="${h(id)}"${aberta ? " open" : ""}><summary>${h(titulo)} <small>${itens.length} jogo${itens.length === 1 ? "" : "s"}</small></summary><ul class="av-lista">${itens.map(linha).join("")}</ul></details>`;
    const comps = [...porComp.entries()].sort((a, b) => (compsTurma.has(b[0]) - compsTurma.has(a[0])) || b[1].length - a[1].length);
    el.innerHTML = `<div class="linha-titulo"><h3><span class="tv-ponto" aria-hidden="true"></span>${v.rl ? `Rodada ${v.rl} da turma` : "Jogos de copa da turma"} <small class="tv-estado"></small></h3></div>
      <div class="tv-corpo">${turma.length ? `<ul class="av-lista tv-lista-turma">${turma.map(linha).join("")}</ul>` : ""}
      ${comps.map(([id, itens]) => secao(nomeComp(id), itens, TV.abertos.has(id), id)).join("")}</div>`;
    for (const d of el.querySelectorAll(".tv-secao")) d.addEventListener("toggle", () => { if (d.open) TV.abertos.add(d.dataset.sec); else TV.abertos.delete(d.dataset.sec); });
    const fontes = new Map([...turma, ...(v.paralelos || [])].map((x) => [x.id, x]));
    TV.linhas = [...el.querySelectorAll(".av-jogo")].map((li) => ({ id: li.dataset.id, turma: !!li.dataset.turma, x: fontes.get(li.dataset.id), li, placar: li.querySelector(".av-placar"), min: li.querySelector(".av-min"), txt: "", minTxt: "" }));
  }

  // um quadro: o placar e o minuto de cada jogo
  function passo() {
    if (TV.encerrada && pausaRestante() <= 0) { TV.v = null; TV.encerrada = null; return desenhar(); } // a pausa acabou: os resultados saem da tela
    const v = TV.v, el = alvo();
    if (!v || !el || el.classList.contains("hidden")) return;
    const fimRodada = !!TV.encerrada, finais = new Map(((TV.encerrada && TV.encerrada.jogos) || []).map((j) => [`${j.casa}|${j.fora}`, j.placar]));
    const doServidor = new Map([...(v.meu ? [v.meu] : []), ...(v.outros || [])].map((o) => [o.id, o]));
    for (const l of TV.linhas) {
      const x = l.turma ? doServidor.get(l.id) || l.x : l.x; if (!x) continue;
      const fim = fimRodada || (l.turma ? !!x.fim : minutoRodada(v) >= 95), min = l.turma ? minutoTurma(v, x) : minutoRodada(v);
      const gols = golsDe(x), final = fimRodada && l.turma ? finais.get(`${x.casa}|${x.fora}`) : null;
      const vistos = fim ? gols : gols.filter((g) => tempo(g) <= min + 1e-9);
      const [a, b] = final || (fim && x.placar && !x.penaltis ? x.placar : vistos.reduce((p, g) => { p[g.lado]++; return p; }, [0, 0]));
      const txt = `${a} × ${b}`, minTxt = fim ? "Fim" : min < 0.5 ? "" : min > 45 && min < 46 ? "Int" : `${Math.floor(min)}'`;
      if (txt !== l.txt) {
        if (l.txt !== "" && !fimRodada) { l.li.classList.remove("gol"); void l.li.offsetWidth; l.li.classList.add("gol"); }
        l.placar.textContent = l.txt = txt;
      }
      if (minTxt !== l.minTxt) { l.min.textContent = l.minTxt = minTxt; l.li.classList.toggle("fim", fim); }
    }
    const estado = el.querySelector(".tv-estado"), txt = fimRodada ? `encerrada${pausaRestante() > 0 ? ` · próxima em ${mmss(pausaRestante())}` : ""}` : "ao vivo";
    if (estado && estado.textContent !== txt) estado.textContent = txt;
    el.classList.toggle("tv-encerrada", fimRodada);
  }

  // mostra, esconde ou remonta o painel
  function desenhar() {
    const v = TV.v, ver = !!v && (TV.encerrada ? true : assistindo(v));
    for (const el of [$("cartaoAoVivo"), $("gAoVivo")]) if (el && (!ver || el !== alvo())) { el.classList.add("hidden"); el.innerHTML = ""; }
    const el = alvo();
    if (!ver || !el) { TV.chave = ""; clearInterval(relogio); relogio = null; return; }
    const chave = `${typeof telaAtual !== "undefined" ? telaAtual : ""}|${v.n}|${(v.outros || []).map((o) => o.id).join(",")}|${(v.paralelos || []).length}|${!!TV.encerrada}`;
    if (chave !== TV.chave || !el.innerHTML) { TV.chave = chave; el.classList.remove("hidden"); montar(v, el); }
    passo();
    if (!relogio) relogio = setInterval(() => { if (!document.hidden) passo(); }, 250);
  }

  if (location.hash.includes("debug")) window.__turma = TV;
  return {
    // a rodada que o servidor mandou (o mais novo vale)
    rodada(v) { if (!v) return; if (!TV.v || TV.v.n !== v.n) TV.abertos.clear(); TV.v = v; TV.encerrada = null; desenhar(); },
    // o estado da sala: a rodada acabou (os resultados ficam na pausa) ou a pausa acabou (o painel some)
    sala(st) {
      if (st.rodada) { TV.encerrada = null; if (TV.v && TV.v.n !== st.rodada.n) TV.v = null; return desenhar(); } // a rodada nova chega no evento "rodada"
      if (TV.v && st.ultimaRodada && st.ultimaRodada.n === TV.v.n && st.liberaEm) TV.encerrada = st.ultimaRodada;
      else { TV.v = null; TV.encerrada = null; }
      desenhar();
    },
    // a tela mudou (sede, sala...): o painel vai para o lugar certo
    tela() { TV.chave = ""; desenhar(); },
  };
})();
