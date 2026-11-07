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
  // um trecho da volta, de uma fração a outra (passa pela linha de chegada quando f1 < f0)
  const trecho = (f0, f1) => { const a = Math.floor(f0 * n), b = Math.floor(f1 * n) + (f1 < f0 ? n : 0); let s2 = ""; for (let i = a; i <= b; i += 2) s2 += (i === a ? "M" : "L") + pt(pts[i % n]).map((v) => v.toFixed(1)).join(" "); return s2 + "L" + pt(pts[b % n]).map((v) => v.toFixed(1)).join(" "); };
  return (mapaCache[id] = { d, pt: (f) => pt(pts[Math.floor(f * n) % n]), largada: pt(pts[0]), trecho, alturas: window.Pistas.pontos(t, 6).map((p) => p.h) }); // (a altura só sai certa no passo 6, o que `pontos` usa para ler o relevo)
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
const COR_SETOR = ["#e10600", "#2aa8ff", "#ffd100"], SETORES = [[0, 1 / 3], [1 / 3, 2 / 3], [2 / 3, 0.9999]];
const zonasDrs = (t) => (t.drs || []).map(([, de, ate]) => [de, ate]); // [detecção, abre, fecha]: o trecho aberto vai de "abre" a "fecha"
function mapaSvg(id, classe = "sn-sobre-svg", g = null, ms = null, detalhe = false) {
  g = g || window.GpInfo.get(id); ms = ms || marcasSobre(id, g.curvas);
  const t = PISTAS[id], mapa = mapaSobre(id), [lx, ly] = mapa.largada;
  const elos = ms.filter((k) => Math.hypot(k.mx - k.x, k.my - k.y) > 1.2).map((k) => `<line class="elo" x1="${k.x.toFixed(1)}" y1="${k.y.toFixed(1)}" x2="${k.mx.toFixed(1)}" y2="${k.my.toFixed(1)}"/>`).join("");
  const marcas = ms.map((k, i) => `<g class="sn-marca" data-n="${k.n}" style="--i:${i}" transform="translate(${k.mx.toFixed(1)} ${k.my.toFixed(1)})"><circle r="3.5"/><text y="1.4">${k.n}</text></g>`).join("");
  return `<svg class="${classe}" viewBox="0 0 100 100" role="img" aria-label="Mapa de ${h(t.name)}${g.curvas.length ? ` com as ${g.curvas.length} curvas numeradas` : ""}"><path class="base" d="${mapa.d}"/><path class="fio" pathLength="1" d="${mapa.d}"/>${detalhe ? SETORES.map(([a, b], i) => `<path class="setor" stroke="${COR_SETOR[i]}" d="${mapa.trecho(a, b)}"/>`).join("") + zonasDrs(t).map(([a, b]) => `<path class="drs" d="${mapa.trecho(a, b)}"/>`).join("") : ""}<rect class="largada" x="${(lx - 1.6).toFixed(1)}" y="${(ly - 1.6).toFixed(1)}" width="3.2" height="3.2"/>${elos}${marcas}</svg>`;
}
// os setores de tempo, as zonas de DRS e o perfil de altura da volta, que saem dos mesmos dados da corrida
const fmtT = (s) => (s == null ? "" : s >= 60 ? `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, "0")}` : s.toFixed(3));
// `rec`: { top: {piloto, tempo} | null, setores: [..] } do quadro de recordes, quando já chegou do servidor
function fichaDetalhe(id, g = window.GpInfo.get(id), rec = null) {
  const t = PISTAS[id], mapa = mapaSobre(id), hs = mapa.alturas, N = hs.length, mn = Math.min(...hs), mx = Math.max(...hs), amp = Math.max(1, mx - mn), W = 300, A = 46;
  const faixa = (i0, i1) => { let s = ""; for (let i = i0; i <= i1; i += 3) s += `${s ? "L" : "M"}${((i / N) * W).toFixed(1)} ${(A - 3 - ((hs[i % N] - mn) / amp) * (A - 8)).toFixed(1)}`; return s; };
  const perfil = amp >= 4 ? `<figure class="sn-sobre-perfil"><figcaption>Altura ao longo da volta</figcaption><svg viewBox="0 0 ${W} ${A}" preserveAspectRatio="none" role="img" aria-label="Perfil de altura da volta">${SETORES.map(([a, b], i) => `<path fill="none" stroke="${COR_SETOR[i]}" stroke-width="2" vector-effect="non-scaling-stroke" d="${faixa(Math.floor(a * N), Math.floor(b * N))}"/>`).join("")}</svg></figure>` : "";
  const setores = SETORES.map(([a, b], i) => {
    const cs = g.curvas.filter((c) => c.f >= a && c.f < b), faixaC = cs.length ? (cs.length > 1 ? `Curvas ${cs[0].n} a ${cs[cs.length - 1].n}` : `Curva ${cs[0].n}`) : "";
    const r = rec?.setores?.[i];
    return `<li><i style="background:${COR_SETOR[i]}"></i><b>Setor ${i + 1}</b><span>${faixaC}</span>${rec ? `<em>${r ? `${fmtT(r.tempo)} · ${h(r.piloto)}` : "sem tempo ainda"}</em>` : ""}</li>`;
  }).join("");
  const drs = zonasDrs(t);
  return `<div class="sn-sobre-ficha"><ul class="sn-sobre-setores">${setores}${drs.length ? `<li><i class="drs"></i><b>DRS</b><span>${plural(drs.length, "zona")}</span></li>` : ""}${rec ? `<li class="recorde"><i></i><b>Recorde</b><span></span><em>${rec.top ? `${fmtT(rec.top.tempo)} · ${h(rec.top.piloto)}` : "sem tempo ainda"}</em></li>` : ""}</ul>${perfil}</div>`;
}
const fmtKm = (km) => km.toFixed(3).replace(".", ",");
// o quadro de recordes (setores e volta) de todas as pistas, guardado por um minuto; `aoChegar` redesenha quem pediu
let quadro = null, quadroEm = 0, buscando = null;
function recordesDa(id, aoChegar) {
  if (Date.now() - quadroEm > 60000 && !buscando) buscando = fetch("/api/recordes-corrida").then((r) => r.json()).then((d) => { quadro = {}; for (const p of d.pistas || []) quadro[p.id] = { top: p.top?.[0] || null, setores: p.setores || [] }; quadroEm = Date.now(); buscando = null; aoChegar?.(); }).catch(() => { buscando = null; quadroEm = Date.now(); });
  return quadro && quadro[id] || null;
}
function corpo(id, rec = null, tituloId = "sobreTit") {
  const G = window.GpInfo, g = G.get(id), t = PISTAS[id], ms = marcasSobre(id, g.curvas), nom = G.curvasNomeadas(id);
  const chips = (g.km ? chip(`${fmtKm(g.km)} km`) : "") + (g.voltas ? chip(`${plural(g.voltas, "volta")} oficiais`) : "") + (g.curvas.length ? chip(plural(g.curvas.length, "curva")) : "") + (nom ? chip(`${nom} com nome`) : "") + (rec ? chip(`Seu recorde ${fmt(rec.t)}`, "ouro") : "");
  const lugar = g.real ? `${G.bandeira(id)}<span>${h(g.cidade)} · ${h(g.pais)}</span>` : `<span>Pista da Corrida da Galera</span>`;
  const svg = mapaSvg(id, "sn-sobre-svg", g, ms, true);
  const lista = g.curvas.length
    ? `<ol class="sn-sobre-lista" aria-label="Curvas de ${h(g.gp)}">${g.curvas.map((c, i) => `<li style="--i:${i}"><button class="sn-curva ${c.nome ? "" : "sem"}" data-curva="${c.n}" aria-label="Curva ${c.n}${c.nome ? `, ${h(c.nome)}` : ""}"><b>${c.n}</b><span>${c.nome ? h(c.nome) : `Curva ${c.n}`}</span></button></li>`).join("")}</ol>`
    : `<p class="sn-sobre-vazio">${h(t.sub)}</p>`;
  return `<div class="sn-sobre-conteudo"><header class="sn-sobre-cab"><div class="sn-sobre-lugar">${lugar}</div><h2 ${tituloId ? `id="${tituloId}"` : ""}>${h(g.gp)}</h2>${g.real ? `<p class="sn-sobre-circ">${h(g.circuito)}</p>` : ""}<div class="sn-chips">${chips}</div></header><div class="sn-sobre-meio"><figure class="sn-sobre-mapa">${svg}</figure><div class="sn-sobre-lado">${fichaDetalhe(id, g, recordesDa(id))}${lista}</div></div></div>`;
}
root.GpSobre = { corpo, mapaSvg, fichaDetalhe, recordesDa };
})(window);
