// Road to Champions: o DESENHO do protagonista. Lê só a `figura` (road-regras.js: aparencia, visual e expressao) e as
// cores do clube, e devolve um SVG. É a peça trocável: quando vier um estilo cartoon novo (ou 3D), ele substitui este
// arquivo e lê os mesmos dados (a `aparencia.versao` diz de que versão eles são). Nada aqui decide regra de jogo.
(function () {
  "use strict";
  const R = window.RoadRegras;
  const esc = (x) => String(x == null ? "" : x).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // um tom mais escuro (sombra) de uma cor #rrggbb
  function escurecer(hex, f = 0.78) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "")); if (!m) return "#00000055";
    const n = parseInt(m[1], 16), c = (v) => Math.round(v * f).toString(16).padStart(2, "0");
    return "#" + c(n >> 16) + c((n >> 8) & 255) + c(n & 255);
  }

  function cabelo(estilo, cor) {
    const s = escurecer(cor, 0.7);
    switch (estilo) {
      case "raspado": return `<path d="M21 20c0-8 5-12 11-12s11 4 11 12c-3-4-7-6-11-6s-8 2-11 6z" fill="${cor}" opacity=".55"/>`;
      case "curto": return `<path d="M20 21c-1-9 5-14 12-14s13 5 12 14c-2-4-6-7-12-7s-10 3-12 7z" fill="${cor}"/>`;
      case "topete": return `<path d="M20 21c-1-8 4-13 11-13 3-4 10-4 13 0-2 0-3 1-3 2 3 2 4 6 3 11-2-4-6-7-12-7s-10 3-12 7z" fill="${cor}"/>` +
        `<path d="M31 8c3-3 8-3 11 0" stroke="${s}" stroke-width="1.2" fill="none"/>`;
      case "cacheado": return [[22, 15, 4.5], [27, 10.5, 5], [33, 9, 5.2], [39, 11, 5], [43, 16, 4.2], [21, 20, 3], [44, 21, 3]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${cor}"/><circle cx="${x - 1}" cy="${y - 1}" r="${r / 3}" fill="${s}" opacity=".5"/>`).join("");
      case "black": return `<ellipse cx="32" cy="15" rx="16" ry="11" fill="${cor}"/><ellipse cx="32" cy="12" rx="12" ry="6" fill="${s}" opacity=".35"/>`;
      case "trancas": return `<path d="M20 21c-1-9 5-14 12-14s13 5 12 14c-2-4-6-7-12-7s-10 3-12 7z" fill="${cor}"/>` +
        [21, 24, 40, 43].map((x) => `<path d="M${x} 19v${x < 30 ? 15 : 15}" stroke="${cor}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="2.2 .8"/>`).join("") +
        [26, 29, 32, 35, 38].map((x) => `<path d="M${x} 8.5v6" stroke="${s}" stroke-width=".8"/>`).join("");
      case "coque": return `<path d="M20.5 21c-1-8 5-13 11.5-13s12.5 5 11.5 13c-2-5-6-7-11.5-7s-9.5 2-11.5 7z" fill="${cor}"/>` +
        `<circle cx="32" cy="5.5" r="4.6" fill="${cor}"/><path d="M28 8h8" stroke="${s}" stroke-width="1.4"/>`;
      case "longo": return `<path d="M19 30c-2-14 3-23 13-23s15 9 13 23l-3-1c0-7-2-12-10-13-8 1-10 6-10 13z" fill="${cor}"/>`;
      default: return "";
    }
  }
  function barba(tipo, cor) {
    switch (tipo) {
      case "rala": return `<path d="M22.5 25c1 7 5 10 9.5 10s8.5-3 9.5-10c-2 4-5 6-9.5 6s-7.5-2-9.5-6z" fill="${cor}" opacity=".4"/>`;
      case "cheia": return `<path d="M21.5 23c0 9 4.5 13.5 10.5 13.5s10.5-4.5 10.5-13.5c-2 5-5 6.5-10.5 6.5s-8.5-1.5-10.5-6.5z" fill="${cor}" opacity=".92"/>`;
      case "cavanhaque": return `<path d="M29 31h6l-1 4.5h-4z" fill="${cor}"/>`;
      default: return "";
    }
  }

  const CHUTEIRAS = { pretas: ["#121212", "#121212"], brancas: ["#efefef", "#efefef"], douradas: ["#d9b44a", "#d9b44a"], coloridas: ["#ff3b6b", "#35d0ff"] };
  // o formato do rosto: a cabeça, onde ficam as orelhas e a sombra do queixo
  function rosto(forma, pele, sombra) {
    const orelhas = (dx) => `<circle cx="${32 - dx}" cy="23" r="2.4" fill="${sombra}"/><circle cx="${32 + dx}" cy="23" r="2.4" fill="${sombra}"/>`;
    switch (forma) {
      case "redondo": return orelhas(12) + `<ellipse cx="32" cy="22.3" rx="12.2" ry="11.6" fill="${pele}"/>`;
      case "fino": return orelhas(10.2) + `<ellipse cx="32" cy="21.8" rx="9.8" ry="12.4" fill="${pele}"/>`;
      case "quadrado": return orelhas(11.6) + `<rect x="21" y="10.4" width="22" height="23.2" rx="6.5" ry="7.5" fill="${pele}"/>`;
      default: return orelhas(11.4) + `<ellipse cx="32" cy="22" rx="11" ry="12" fill="${pele}"/>`;
    }
  }
  // figuras salvas antes das três partes (tudo num objeto só) ainda desenham
  function partes(f) {
    f = f && typeof f === "object" ? f : {};
    if (f.aparencia) return f;
    return { aparencia: f, visual: { numero: f.numero, acessorio: ["corrente", "faixa", "fones", "oculos"].includes(f.marca) ? f.marca : "nenhum",
      chuteiras: f.marca === "chuteiras" ? "coloridas" : "pretas" }, expressao: { semblante: f.marca === "sorriso" ? "sorriso" : "serio" } };
  }

  // figura: { aparencia, visual, expressao } de road-regras.js; cores: [camisa, detalhe] do clube
  function svg(figura, cores = [], { tam = 64, titulo = "" } = {}) {
    const f = partes(figura);
    // o servidor já mandou limpo; os padrões só cobrem campanhas sem figura
    const a = { pele: 3, rosto: "oval", cabelo: "curto", corCabelo: "preto", barba: "nenhuma", altura: 1, largura: 1, ...(f.aparencia || {}) };
    const v = { numero: 10, acessorio: "nenhum", chuteiras: "pretas", ...(f.visual || {}) };
    const e = { semblante: "serio", ...(f.expressao || {}) };
    const pele = (R?.PELES || {})[a.pele] || "#c68b5e", sombraPele = escurecer(pele, 0.82);
    const corCabelo = (R?.CORES_CABELO || {})[a.corCabelo] || "#1c1410";
    const camisa = cores[0] || "#245ba3", detalhe = cores[1] || "#ffffff";
    const marca = v.acessorio;
    const chuteiras = CHUTEIRAS[v.chuteiras] || CHUTEIRAS.pretas;
    const boca = e.semblante === "sorriso"
      ? `<path d="M27.5 28.5q4.5 4.5 9 0z" fill="#fff" stroke="#5a2a20" stroke-width=".8"/>`
      : `<path d="M29.5 29.5q2.5 1.4 5 0" stroke="#5a2a20" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    const extras = {
      corrente: `<path d="M26 38q6 6 12 0" stroke="#f2c94c" stroke-width="1.3" fill="none"/><circle cx="32" cy="42.2" r="1.4" fill="#f2c94c"/>`,
      faixa: `<path d="M20.5 16.5q11.5-4 23 0v3q-11.5-4-23 0z" fill="#f4f4f4"/><path d="M21 18.6q11-3.6 22 0" stroke="${camisa}" stroke-width=".9" fill="none"/>`,
      fones: `<path d="M22 39q10 7 20 0" stroke="#222" stroke-width="2.2" fill="none"/><ellipse cx="22.5" cy="38" rx="3" ry="3.6" fill="#2c2c2c"/><ellipse cx="41.5" cy="38" rx="3" ry="3.6" fill="#2c2c2c"/>`,
      oculos: `<rect x="23" y="19.5" width="7.5" height="5" rx="2.2" fill="#ff9d2e" opacity=".85" stroke="#3a2a12" stroke-width=".7"/><rect x="33.5" y="19.5" width="7.5" height="5" rx="2.2" fill="#ff9d2e" opacity=".85" stroke="#3a2a12" stroke-width=".7"/><path d="M30.5 21.5h3" stroke="#3a2a12" stroke-width=".7"/>`,
    };
    const atras = a.cabelo === "black" || a.cabelo === "longo" ? cabelo(a.cabelo, corCabelo) : "";
    const frente = a.cabelo === "black" || a.cabelo === "longo" ? "" : cabelo(a.cabelo, corCabelo);
    const h = Math.round(tam * 1.5);
    return `<svg class="rtc-figura" viewBox="0 0 64 96" width="${tam}" height="${h}" role="img" aria-label="${esc(titulo || "Protagonista")}">` +
      `<ellipse cx="32" cy="93" rx="15" ry="2.6" fill="#000" opacity=".35"/>` +
      `<g transform="translate(32 93) scale(${a.largura} ${a.altura}) translate(-32 -93)">` +
      // pernas, meias e chuteiras
      `<rect x="24.5" y="66" width="6" height="19" rx="2" fill="${pele}"/><rect x="33.5" y="66" width="6" height="19" rx="2" fill="${pele}"/>` +
      `<rect x="24.5" y="76" width="6" height="11" fill="${detalhe}"/><rect x="33.5" y="76" width="6" height="11" fill="${detalhe}"/>` +
      `<path d="M23 86h8.5v4.5h-10z" fill="${chuteiras[0]}" stroke="#0007" stroke-width=".6"/><path d="M33 86h8.5l1.5 4.5h-10z" fill="${chuteiras[1]}" stroke="#0007" stroke-width=".6"/>` +
      // calção
      `<path d="M22.5 58h19l1.5 11h-8.5l-2.5-4-2.5 4h-8.5z" fill="${escurecer(detalhe, 0.9)}"/>` +
      // braços
      `<rect x="14" y="41" width="6" height="17" rx="3" fill="${pele}" transform="rotate(8 17 41)"/>` +
      `<rect x="44" y="41" width="6" height="17" rx="3" fill="${pele}" transform="rotate(-8 47 41)"/>` +
      // camisa
      `<path d="M21 38l-7 5 3 6 4-2v12h22V47l4 2 3-6-7-5-6-1.5h-10z" fill="${camisa}"/>` +
      `<path d="M27 36.5q5 4 10 0" stroke="${detalhe}" stroke-width="1.6" fill="none"/>` +
      `<path d="M21 47v12h22V47" fill="${escurecer(camisa, 0.9)}" opacity=".35"/>` +
      `<text x="32" y="54.5" text-anchor="middle" font-family="Barlow Condensed,Arial,sans-serif" font-weight="800" font-size="10" fill="${detalhe}">${esc(v.numero)}</text>` +
      // pescoço e cabeça
      `<rect x="28.5" y="31" width="7" height="7" fill="${sombraPele}"/>` + atras +
      rosto(a.rosto, pele, sombraPele) +
      `<path d="M37 31c4-2 6-6 6-10" stroke="${sombraPele}" stroke-width="2" fill="none" opacity=".6"/>` +
      barba(a.barba, corCabelo) +
      `<ellipse cx="27.5" cy="22" rx="1.3" ry="1.6" fill="#1a1a1a"/><ellipse cx="36.5" cy="22" rx="1.3" ry="1.6" fill="#1a1a1a"/>` +
      `<path d="M25.5 18.8l4-.6M34.5 18.2l4 .6" stroke="${escurecer(corCabelo, 0.8)}" stroke-width="1.1" stroke-linecap="round"/>` +
      boca + frente + (extras[marca] || "") +
      `</g></svg>`;
  }
  window.Aparencia = { svg };
})();
