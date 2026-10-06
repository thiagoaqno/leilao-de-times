// Leilão da Galera — a carta de jogador, no estilo das cartas do FUT (usada no sorteio, no palco, no começo da página e
// na carta do gol do campeonato ao vivo). A cor acompanha a nota: dourada (90 ou mais), prata (87 a 89) e a padrão. Nos temas
// sem nota (CS, comida, lista própria), a carta é "neutra" e mostra a categoria no lugar da nota. O rosto do jogador
// é desenhado em pixel-art por rostos.js.
const nivelDe = (ovr) => (ovr >= 90 ? "ouro" : ovr >= 87 ? "prata" : "padrao");
const POS_CARTA = { GK: "GOL", DEF: "ZAG", MID: "MEI", MEI: "MEI", VOL: "VOL", ATT: "ATA" };
const SILHUETA = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="33" r="17" fill="currentColor"/><path d="M10 100c0-27 18-43 40-43s40 16 40 43z" fill="currentColor"/></svg>`;
const SIGLAS = { Brasil: "BRA", Argentina: "ARG", França: "FRA", Alemanha: "ALE", Itália: "ITA", Espanha: "ESP", Inglaterra: "ING", Portugal: "POR", Holanda: "HOL",
  Uruguai: "URU", Bélgica: "BEL", Croácia: "CRO", Noruega: "NOR", Egito: "EGI", Polônia: "POL", Suécia: "SUE", Colômbia: "COL", Japão: "JAP", Nigéria: "NIG",
  "Estados Unidos": "EUA", "País de Gales": "GAL", "Irlanda do Norte": "IRN", "Costa do Marfim": "CIV", "Coreia do Sul": "COR", Escócia: "ESC", Eslováquia: "SVK", Eslovênia: "SVN" };
const siglaPais = (p) => SIGLAS[p] || String(p).normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, 3).toUpperCase();
const TIPO_MEIA = { VOL: "volante", MEI: "meia-atacante" };

// os dados da carta de um item ("Nome (Categoria)")
function dadosCarta(item, futebol) {
  const { name, cat } = Ratings.parseItem(item);
  if (!futebol) return { nome: name, nivel: "neutra", topo: cat ? cat.split(/\s+/)[0] : "", meta: cat || "" };
  const p = Escalacao.playerOf(item), info = typeof Quimica !== "undefined" ? Quimica.infoOf(name) : null;
  return { nome: name, nivel: nivelDe(p.ovr), ovr: p.ovr, est: p.est, pos: POS_CARTA[p.pos] || "", pais: info ? siglaPais(info.pais) : "",
    meta: [info && info.pais, TIPO_MEIA[p.pos]].filter(Boolean).join(" · ") || (cat || "") };
}
// nome comprido perde o primeiro nome ("Alessandro Del Piero" → "Del Piero"); se ainda for comprido, fica o último
function nomeCarta(n) {
  if (n.length <= 18) return n;
  const resto = n.split(" ").slice(1).join(" ");
  return resto.length <= 16 ? resto : shortName(n);
}
// o HTML da carta; opções: futebol (mostra nota e posição), cls (classes a mais), icone (o ícone das cartas neutras)
function cartaHTML(item, { futebol = true, cls = "", icone = "estrela" } = {}) {
  const d = dadosCarta(item, futebol), nome = nomeCarta(d.nome);
  const topo = futebol
    ? `<div class="fut-topo"><b class="fut-ovr" ${d.est ? 'title="Nota estimada"' : ""}>${d.ovr}</b><span class="fut-pos">${esc(d.pos)}</span>${d.pais ? `<span class="fut-pais">${esc(d.pais)}</span>` : ""}</div>`
    : `<div class="fut-topo"><b class="fut-ovr">${esc(d.topo)}</b></div>`;
  // o rosto em pixel-art (rostos.js); sem ele, a silhueta
  const foto = futebol ? (window.Rostos ? `<img class="pix" src="${Rostos.de(d.nome)}" alt="">` : SILHUETA) : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-${icone}"/></svg>`;
  return `<div class="fut ${d.nivel}${cls ? " " + cls : ""}"><div class="fut-in">${topo}<div class="fut-foto">${foto}</div>
    <div class="fut-nome${nome.length > 10 ? " longo" : ""}">${esc(nome)}</div><div class="fut-linha"></div><div class="fut-meta">${esc(d.meta)}</div></div></div>`;
}
// o verso (roleta oculta: ninguém sabe quem é)
const versoHTML = (cls = "") => `<div class="fut verso${cls ? " " + cls : ""}"><div class="fut-in"><div class="verso-marca">?<small>Galera</small></div></div></div>`;

// faíscas saindo da carta (carta dourada e o "vendido" para mim)
function faiscas(onde, n = 18, cor) {
  if (semMovimento()) return;
  const box = document.createElement("div"); box.className = "faiscas";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, d = 110 + Math.random() * 90, f = document.createElement("i");
    f.style.setProperty("--x", Math.cos(a) * d + "px"); f.style.setProperty("--y", Math.sin(a) * d + "px");
    f.style.animationDelay = Math.random() * 0.15 + "s"; if (cor) { f.style.background = cor; f.style.boxShadow = `0 0 10px ${cor}`; }
    box.appendChild(f);
  }
  onde.appendChild(box); setTimeout(() => box.remove(), 1500);
}
function semMovimento() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }

// as três cartas em leque no começo da página (lendas sorteadas)
(function () {
  const box = $("heroCartas"), fb = window.FOOTBALL && FOOTBALL.lendas; if (!box || !fb) return;
  const pega = (cat) => { const l = fb[cat] || []; return l[Math.floor(Math.random() * l.length)]; };
  const itens = [pega("Defensor") || pega("Goleiro"), pega("Meio-campo"), pega("Atacante")].filter(Boolean);
  box.innerHTML = itens.map((n) => cartaHTML(n)).join("");
})();
