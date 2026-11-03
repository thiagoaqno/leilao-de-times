// Ficha de GP compartilhada pela sala e pela carreira.
(function (root) {
const PISTAS = root.Pistas.PISTAS;
const h = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const plural = (n, s) => `${n} ${s}${n > 1 ? "s" : ""}`;
const chip = (txt, cls = "") => `<span class="sn-chip ${cls}">${txt}</span>`;
const fmt = (s) => s == null ? "—" : `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
const mapaCache = {};
function mapaSobre(id) { // o traçado em 100 × 100 e a posição de uma fração da volta (a mesma fração das curvas de gp-info.js)
  if (mapaCache[id]) return mapaCache[id];
  const t = PISTAS[id], pts = window.Pistas.pontos(t, 12), n = pts.length;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const s = 78 / Math.max(x1 - x0, y1 - y0), ox = (100 - (x1 - x0) * s) / 2, oy = (100 - (y1 - y0) * s) / 2;
  const pt = (p) => [ox + (p.x - x0) * s, oy + (p.y - y0) * s];
  const d = pts.filter((_, i) => i % 2 === 0).map((p, i) => (i ? "L" : "M") + pt(p).map((v) => v.toFixed(1)).join(" ")).join("") + "Z";
  return (mapaCache[id] = { d, pt: (f) => pt(pts[Math.floor(f * n) % n]), largada: pt(pts[0]) });
}
function marcasSobre(id, curvas) { // os números nas posições certas; os que ficariam um por cima do outro se afastam um pouco
  const m = mapaSobre(id), R = 7.6, ps = curvas.map((c) => { const [x, y] = m.pt(c.f); return { n: c.n, x, y, mx: x, my: y }; });
  for (let it = 0; it < 80; it++) {
    let mexeu = false;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j]; let dx = b.mx - a.mx, dy = b.my - a.my, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      if (d < 0.01) { dx = Math.cos(i * 2.4); dy = Math.sin(i * 2.4); d = 1; }
      const q = (R - d) / 2 / d; a.mx -= dx * q; a.my -= dy * q; b.mx += dx * q; b.my += dy * q; mexeu = true;
    }
    for (const p of ps) { p.mx = Math.max(4, Math.min(96, p.mx)); p.my = Math.max(4, Math.min(96, p.my)); }
    if (!mexeu) break;
  }
  return ps;
}
// O desenho do traçado com as curvas numeradas (viewBox 100 × 100); a sala, a ficha de circuitos e o cartão do próximo GP da carreira usam o mesmo.
function mapaSvg(id, classe = "sn-sobre-svg", g = null, ms = null) {
  g = g || window.GpInfo.get(id); ms = ms || marcasSobre(id, g.curvas);
  const t = PISTAS[id], mapa = mapaSobre(id), [lx, ly] = mapa.largada;
  const elos = ms.filter((k) => Math.hypot(k.mx - k.x, k.my - k.y) > 1.2).map((k) => `<line class="elo" x1="${k.x.toFixed(1)}" y1="${k.y.toFixed(1)}" x2="${k.mx.toFixed(1)}" y2="${k.my.toFixed(1)}"/>`).join("");
  const marcas = ms.map((k, i) => `<g class="sn-marca" data-n="${k.n}" style="--i:${i}" transform="translate(${k.mx.toFixed(1)} ${k.my.toFixed(1)})"><circle r="3.5"/><text y="1.4">${k.n}</text></g>`).join("");
  return `<svg class="${classe}" viewBox="0 0 100 100" role="img" aria-label="Mapa de ${h(t.name)}${g.curvas.length ? ` com as ${g.curvas.length} curvas numeradas` : ""}"><path class="base" d="${mapa.d}"/><path class="fio" pathLength="1" d="${mapa.d}"/><rect class="largada" x="${(lx - 1.6).toFixed(1)}" y="${(ly - 1.6).toFixed(1)}" width="3.2" height="3.2"/>${elos}${marcas}</svg>`;
}
const fmtKm = (km) => km.toFixed(3).replace(".", ",");
function corpo(id, rec = null, tituloId = "sobreTit") {
  const G = window.GpInfo, g = G.get(id), t = PISTAS[id], ms = marcasSobre(id, g.curvas), nom = G.curvasNomeadas(id);
  const chips = (g.km ? chip(`${fmtKm(g.km)} km`) : "") + (g.voltas ? chip(`${plural(g.voltas, "volta")} oficiais`) : "") + (g.curvas.length ? chip(plural(g.curvas.length, "curva")) : "") + (nom ? chip(`${nom} com nome`) : "") + (rec ? chip(`Seu recorde ${fmt(rec.t)}`, "ouro") : "");
  const lugar = g.real ? `${G.bandeira(id)}<span>${h(g.cidade)} · ${h(g.pais)}</span>` : `<span>Pista da Corrida da Galera</span>`;
  const svg = mapaSvg(id, "sn-sobre-svg", g, ms);
  const lista = g.curvas.length
    ? `<ol class="sn-sobre-lista" aria-label="Curvas de ${h(g.gp)}">${g.curvas.map((c, i) => `<li style="--i:${i}"><button class="sn-curva ${c.nome ? "" : "sem"}" data-curva="${c.n}" aria-label="Curva ${c.n}${c.nome ? `, ${h(c.nome)}` : ""}"><b>${c.n}</b><span>${c.nome ? h(c.nome) : `Curva ${c.n}`}</span></button></li>`).join("")}</ol>`
    : `<p class="sn-sobre-vazio">${h(t.sub)}</p>`;
  return `<div class="sn-sobre-conteudo"><header class="sn-sobre-cab"><div class="sn-sobre-lugar">${lugar}</div><h2 ${tituloId ? `id="${tituloId}"` : ""}>${h(g.gp)}</h2>${g.real ? `<p class="sn-sobre-circ">${h(g.circuito)}</p>` : ""}<div class="sn-chips">${chips}</div></header><div class="sn-sobre-meio"><figure class="sn-sobre-mapa">${svg}</figure>${lista}</div></div>`;
}
root.GpSobre = { corpo, mapaSvg };
})(window);
