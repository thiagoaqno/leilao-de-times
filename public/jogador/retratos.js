// Road to Champions: os retratos dos personagens das cenas dubladas (Rafa, Bia, Ventura, a repórter...). Não há foto de
// verdade deles: cada um é um retrato ilustrado em SVG, de busto, com o rosto, o cabelo, a roupa do papel que tem na
// história e o fundo do lugar da cena (o apartamento à noite, a sala de análise, a sala de imprensa, o hotel).
// Retratos.svg(id, { tam }) devolve o SVG (id do manifesto da dublagem: "PRO_BIA", "RES_VENTURA"...); Retratos.tem(id).
// Só desenho: nada daqui muda o jogo.
(function () {
  "use strict";
  // ---------- quem é cada um ----------
  // pele, rosto (largura e queixo), cabelo (estilo e cor), olhos, barba, roupa (tipo e cores), acessórios e o fundo
  const P = {
    ROM_RAFA: { papel: "Amigo da noite", pele: "#b07850", w: 27, queixo: 1, cabelo: ["cacheado", "#1d1410"], olhos: "#3b2414", sobr: "#1d1410", barba: ["rala", "#1d1410"],
      boca: "riso", roupa: ["camisa_aberta", "#e2483b", "#f6c344"], acess: ["corrente"], fundo: "noite", idade: 28 },
    ROM_MARCELO: { papel: "Assessor", pele: "#e8b896", w: 28, queixo: 2, cabelo: ["curto_lados", "#9a9a9a"], olhos: "#4a5a6a", sobr: "#7a7a7a", barba: ["cheia_curta", "#8c8c8c"],
      boca: "serio", roupa: ["blazer", "#1f2d4a", "#e9eef5", "#7d2430"], acess: ["oculos"], fundo: "noite", idade: 47 },
    PRO_BIA: { papel: "Assessora de imagem", pele: "#c98e66", w: 25, queixo: 0, cabelo: ["longo_franja", "#3a2216"], olhos: "#3a2216", sobr: "#2a1810", barba: null,
      boca: "sorriso", roupa: ["blazer", "#b65a6b", "#f3e7e1"], acess: ["brincos", "celular"], fundo: "noite", idade: 32, mulher: true },
    RES_VENTURA: { papel: "Técnico", pele: "#efc6a4", w: 28, queixo: 2, cabelo: ["careca_lados", "#c9c9c9"], olhos: "#56606b", sobr: "#bdbdbd", barba: ["rala", "#b5b5b5"],
      boca: "serio", roupa: ["agasalho", "#f4f4f4", "#5b3f8c"], acess: [], fundo: "analise", idade: 58, rugas: true },
    RES_NANDO: { papel: "Auxiliar técnico", pele: "#6b4630", w: 28, queixo: 1, cabelo: ["raspado", "#120c08"], olhos: "#24150c", sobr: "#120c08", barba: ["cheia", "#120c08"],
      boca: "sorriso", roupa: ["agasalho", "#1f2230", "#d8b04a"], acess: [], fundo: "analise", idade: 38 },
    IMP_LEO: { papel: "Amigo dos games", pele: "#8a5a3c", w: 26, queixo: 0, cabelo: ["black", "#120c08"], olhos: "#24150c", sobr: "#120c08", barba: null,
      boca: "sonolento", roupa: ["moletom", "#3b3f58", "#8f6bff"], acess: ["headset"], fundo: "led", idade: 24, sono: true },
    IMP_DUVAL: { papel: "Coordenador do clube", pele: "#f1cfb4", w: 27, queixo: 2, cabelo: ["penteado", "#a58a64"], olhos: "#3e6a86", sobr: "#8a7050", barba: ["bigode", "#8a7050"],
      boca: "serio", roupa: ["polo", "#14284f", "#d4dbe8"], acess: ["oculos_finos"], fundo: "manha", idade: 51 },
    ENI_HELENA: { papel: "Assessora de imprensa", pele: "#f3d2bc", w: 25, queixo: 0, cabelo: ["chanel", "#d8b46a"], olhos: "#4b6b4e", sobr: "#a8854a", barba: null,
      boca: "serio", roupa: ["blazer", "#4a4d55", "#f2f2f2"], acess: ["cracha", "ponto"], fundo: "imprensa", idade: 41, mulher: true },
    ENI_CLARA: { papel: "Jornalista", pele: "#c08a62", w: 25, queixo: 0, cabelo: ["coque_cacheado", "#3b2316"], olhos: "#3b2316", sobr: "#2b190f", barba: null,
      boca: "curiosa", roupa: ["blusa", "#d9a32e", "#7a5410"], acess: ["oculos_redondos", "cracha", "microfone"], fundo: "imprensa", idade: 30, mulher: true },
    MAQ_LAURA: { papel: "Nutricionista", pele: "#f5d6c2", w: 25, queixo: 0, cabelo: ["rabo", "#b4532a"], olhos: "#4f7a4a", sobr: "#8f3f1e", barba: null,
      boca: "neutro", roupa: ["polo", "#f2f4f6", "#7fb6d9"], acess: ["brincos"], fundo: "hotel", idade: 35, mulher: true, sardas: true },
    MAQ_ANDRE: { papel: "Irmão", pele: "#efc19c", w: 28, queixo: 1, cabelo: ["baguncado", "#d9b46a"], olhos: "#4d7fa6", sobr: "#b48f4c", barba: ["rala", "#c9a35a"],
      boca: "riso", roupa: ["moletom", "#3f6b4f", "#2c4d38"], acess: [], fundo: "hotel", idade: 30 },
    ROM_REP: { papel: "Repórter", pele: "#d9a07a", w: 26, queixo: 1, cabelo: ["penteado", "#1c1612"], olhos: "#2e1e12", sobr: "#1c1612", barba: null,
      boca: "neutro", roupa: ["blazer", "#5d6470", "#eef0f3", "#23395b"], acess: ["microfone"], fundo: "coletiva", idade: 36 },
  };

  // ---------- as contas de cor ----------
  const hex = (h) => { const n = parseInt(String(h).slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mistura = (a, b, t) => { const x = hex(a), y = hex(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  const escuro = (c, t = 0.3) => mistura(c, "#000000", t), claro = (c, t = 0.3) => mistura(c, "#ffffff", t);
  let serie = 0;

  // ---------- os fundos (o lugar da cena) ----------
  function fundo(tipo, u) {
    const g = (a, b) => `<linearGradient id="${u}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
    switch (tipo) {
      case "noite": { // a janela do apartamento: a cidade acesa lá fora
        let luzes = "";
        for (let i = 0; i < 26; i++) { const x = (i * 37) % 160, y = 18 + ((i * 53) % 80), a = 0.25 + ((i * 7) % 5) / 10; luzes += `<rect x="${x}" y="${y}" width="3" height="4" fill="#ffd27a" opacity="${a}"/>`; }
        return { defs: g("#0d1530", "#1d1340"), corpo: `<rect width="160" height="200" fill="url(#${u}f)"/>${luzes}<circle cx="132" cy="34" r="16" fill="#f6c977" opacity=".12"/><circle cx="24" cy="50" r="10" fill="#7fb6ff" opacity=".1"/>` };
      }
      case "analise": // a sala de análise: o quadro tático atrás
        return { defs: g("#1d2b3a", "#0f1822"), corpo: `<rect width="160" height="200" fill="url(#${u}f)"/><rect x="14" y="16" width="132" height="86" rx="3" fill="#20402f" opacity=".75"/>` +
          `<g stroke="#e8f2ea" stroke-width=".8" fill="none" opacity=".55"><rect x="20" y="22" width="120" height="74"/><path d="M80 22v74"/><circle cx="80" cy="59" r="11"/><rect x="20" y="44" width="16" height="30"/><rect x="124" y="44" width="16" height="30"/></g>` +
          `<g fill="#ffd34a" opacity=".7"><circle cx="50" cy="40" r="2.4"/><circle cx="56" cy="74" r="2.4"/><circle cx="104" cy="52" r="2.4"/></g><path d="M50 40 L98 52" stroke="#ffd34a" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/>` };
      case "imprensa": { // a parede de patrocínio da sala de imprensa
        let marcas = "";
        for (let y = 8; y < 130; y += 22) for (let x = (y / 22) % 2 ? 0 : 18; x < 160; x += 36) marcas += `<text x="${x}" y="${y}" font-size="9" font-family="Arial" font-weight="700" fill="#ffffff" opacity=".13">✦ UCL</text>`;
        return { defs: g("#0d2a5c", "#081a3a"), corpo: `<rect width="160" height="200" fill="url(#${u}f)"/>${marcas}` };
      }
      case "coletiva": { // a coletiva pós-jogo: o painel e as luzes das câmeras
        let marcas = "";
        for (let y = 12; y < 130; y += 26) for (let x = (y / 26) % 2 ? 6 : 26; x < 160; x += 40) marcas += `<text x="${x}" y="${y}" font-size="8" font-family="Arial" font-weight="700" fill="#cfd8e6" opacity=".18">CHAMPIONS</text>`;
        return { defs: g("#16213a", "#0b1222"), corpo: `<rect width="160" height="200" fill="url(#${u}f)"/>${marcas}<circle cx="18" cy="24" r="12" fill="#fff" opacity=".1"/><circle cx="142" cy="20" r="9" fill="#fff" opacity=".08"/>` };
      }
      case "hotel": // o quarto do hotel: a luz quente do abajur
        return { defs: g("#4a3222", "#21160f") + `<radialGradient id="${u}l" cx=".2" cy=".25" r=".6"><stop offset="0" stop-color="#ffcf8a" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf8a" stop-opacity="0"/></radialGradient>`,
          corpo: `<rect width="160" height="200" fill="url(#${u}f)"/><rect width="160" height="200" fill="url(#${u}l)"/><rect x="118" y="20" width="30" height="60" fill="#2c1e14" opacity=".6"/>` };
      case "led": // o quarto do gamer: a fita de LED roxa
        return { defs: g("#191233", "#0b0816"), corpo: `<rect width="160" height="200" fill="url(#${u}f)"/><rect x="0" y="22" width="160" height="3" fill="#a46bff" opacity=".8"/><rect x="0" y="18" width="160" height="12" fill="#a46bff" opacity=".18"/>` +
          `<rect x="104" y="40" width="44" height="28" rx="2" fill="#0a0a12" stroke="#3a2f66"/><rect x="108" y="44" width="36" height="20" fill="#3cf0c8" opacity=".25"/>` };
      case "manha": // a manhã em Paris: a janela clara
        return { defs: g("#c9d8e6", "#8fa4b8"), corpo: `<rect width="160" height="200" fill="url(#${u}f)"/><rect x="96" y="12" width="52" height="70" fill="#eef6ff" opacity=".55"/><path d="M122 12v70M96 47h52" stroke="#8fa4b8" stroke-width="2"/>` };
      default:
        return { defs: g("#22304a", "#111a2a"), corpo: `<rect width="160" height="200" fill="url(#${u}f)"/>` };
    }
  }

  // ---------- a roupa ----------
  const OMBROS = "M0 200 L0 182 C8 160 34 148 62 143 L98 143 C126 148 152 160 160 182 L160 200 Z";
  function roupa([tipo, cor, det, gravata], pele, u) {
    const sombra = escuro(cor, 0.25);
    const base = `<path d="${OMBROS}" fill="${cor}"/><path d="M0 200 L0 186 C14 172 30 166 46 164 L44 200 Z" fill="${sombra}" opacity=".45"/><path d="M160 200 L160 186 C146 172 130 166 114 164 L116 200 Z" fill="${sombra}" opacity=".45"/>`;
    switch (tipo) {
      case "blazer": // a camisa por dentro, as lapelas e (às vezes) a gravata
        return base + `<path d="M64 143 L80 176 L96 143 Z" fill="${det}"/>` +
          (gravata ? `<path d="M77 150 L83 150 L85 158 L80 186 L75 158 Z" fill="${gravata}"/><path d="M76 146 L84 146 L83 151 L77 151 Z" fill="${escuro(gravata, 0.2)}"/>` : `<path d="M70 143 Q80 152 90 143" fill="${pele}"/>`) +
          `<path d="M62 143 L80 182 L70 200 L52 200 L46 162 Z" fill="${escuro(cor, 0.12)}"/><path d="M98 143 L80 182 L90 200 L108 200 L114 162 Z" fill="${escuro(cor, 0.12)}"/>` +
          `<path d="M62 143 L72 166 L60 168 Z" fill="${claro(cor, 0.12)}"/><path d="M98 143 L88 166 L100 168 Z" fill="${claro(cor, 0.12)}"/>`;
      case "camisa_aberta": { // a camisa estampada, aberta no peito
        const pad = `<pattern id="${u}e" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2.2" fill="${det}" opacity=".8"/><circle cx="9" cy="9" r="1.6" fill="#ffffff" opacity=".5"/></pattern>`;
        return `<defs>${pad}</defs>` + base + `<path d="${OMBROS}" fill="url(#${u}e)"/><path d="M66 143 L80 172 L94 143 Z" fill="${pele}"/>` +
          `<path d="M62 141 L80 172 L70 150 Z" fill="${escuro(cor, 0.2)}"/><path d="M98 141 L80 172 L90 150 Z" fill="${escuro(cor, 0.2)}"/>`;
      }
      case "agasalho": // o agasalho de treino do clube: o zíper e as faixas no ombro
        return base + `<path d="M66 141 Q80 150 94 141 L96 150 Q80 158 64 150 Z" fill="${escuro(cor, 0.12)}"/><path d="M80 152 V200" stroke="${escuro(cor, 0.35)}" stroke-width="1.6"/>` +
          `<path d="M10 172 C26 158 44 152 60 149" stroke="${det}" stroke-width="5" fill="none"/><path d="M150 172 C134 158 116 152 100 149" stroke="${det}" stroke-width="5" fill="none"/>` +
          `<circle cx="104" cy="168" r="5" fill="${det}" opacity=".9"/>`;
      case "moletom": // o moletom com o capuz atrás do pescoço e os cordões
        return `<path d="M46 150 C52 132 108 132 114 150 Z" fill="${escuro(cor, 0.2)}"/>` + base +
          `<path d="M60 146 Q80 160 100 146" stroke="${escuro(cor, 0.3)}" stroke-width="4" fill="none"/><path d="M73 154 v20 M87 154 v20" stroke="${det}" stroke-width="2" stroke-linecap="round"/>`;
      case "polo": // a polo do staff: a gola e os botões
        return base + `<path d="M64 141 L80 154 L96 141 L98 148 L80 160 L62 148 Z" fill="${det}"/><path d="M80 154 V172" stroke="${escuro(cor, 0.25)}" stroke-width="1.2"/>` +
          `<circle cx="80" cy="162" r="1.2" fill="${escuro(cor, 0.4)}"/><circle cx="80" cy="168" r="1.2" fill="${escuro(cor, 0.4)}"/><circle cx="108" cy="170" r="4" fill="${escuro(det, 0.1)}" opacity=".8"/>`;
      case "blusa": // a blusa de gola redonda
        return base + `<path d="M64 143 Q80 160 96 143" fill="${pele}"/><path d="M64 143 Q80 160 96 143" stroke="${det}" stroke-width="2" fill="none"/>`;
      default:
        return base + `<path d="M66 143 Q80 156 94 143" fill="${pele}"/>`;
    }
  }

  // ---------- o cabelo: o que fica atrás da cabeça e o que fica na frente ----------
  function cabeloAtras([estilo, cor], w) {
    const e = escuro(cor, 0.25);
    switch (estilo) {
      case "longo_franja": return `<path d="M${80 - w - 6} 76 C${80 - w - 10} 40 ${80 + w + 10} 40 ${80 + w + 6} 76 L${80 + w + 10} 152 C${80 + w - 2} 160 ${80 - w + 2} 160 ${80 - w - 10} 152 Z" fill="${e}"/>`;
      case "chanel": return `<path d="M${80 - w - 6} 78 C${80 - w - 8} 42 ${80 + w + 8} 42 ${80 + w + 6} 78 L${80 + w + 7} 116 C${80 + w - 4} 122 ${80 - w + 4} 122 ${80 - w - 7} 116 Z" fill="${e}"/>`;
      case "rabo": return `<path d="M${80 + w - 2} 66 C${80 + w + 16} 74 ${80 + w + 14} 120 ${80 + w + 4} 138 C${80 + w + 2} 112 ${80 + w - 2} 92 ${80 + w - 8} 76 Z" fill="${cor}"/>`;
      case "black": return `<ellipse cx="80" cy="62" rx="${w + 13}" ry="30" fill="${cor}"/><ellipse cx="80" cy="54" rx="${w + 6}" ry="16" fill="${claro(cor, 0.12)}" opacity=".5"/>`;
      case "coque_cacheado": return `<circle cx="80" cy="36" r="13" fill="${cor}"/><circle cx="74" cy="32" r="5" fill="${claro(cor, 0.15)}" opacity=".5"/><circle cx="86" cy="38" r="4" fill="${claro(cor, 0.15)}" opacity=".5"/>`;
      default: return "";
    }
  }
  function cabeloFrente([estilo, cor], w) {
    const e = escuro(cor, 0.22), c = claro(cor, 0.18);
    const topo = (linha = 60) => `<path d="M${80 - w - 1} 82 C${80 - w - 4} 42 ${80 + w + 4} 42 ${80 + w + 1} 82 C${80 + w - 2} 68 ${80 + w - 10} ${linha} 80 ${linha + 1} C${80 - w + 10} ${linha} ${80 - w + 2} 68 ${80 - w - 1} 82 Z" fill="${cor}"/>`;
    switch (estilo) {
      case "curto_lados": return topo(58) + `<path d="M${80 - w} 82 v-14 M${80 + w} 82 v-14" stroke="${e}" stroke-width="3" opacity=".4"/><path d="M60 54 Q80 46 100 54" stroke="${c}" stroke-width="2" fill="none" opacity=".6"/>`;
      case "careca_lados": return `<path d="M${80 - w - 1} 92 C${80 - w - 2} 76 ${80 - w + 2} 68 ${80 - w + 7} 64 L${80 - w + 7} 90 Z" fill="${cor}"/><path d="M${80 + w + 1} 92 C${80 + w + 2} 76 ${80 + w - 2} 68 ${80 + w - 7} 64 L${80 + w - 7} 90 Z" fill="${cor}"/>` +
        `<ellipse cx="74" cy="52" rx="10" ry="5" fill="#ffffff" opacity=".18"/>`;
      case "raspado": return `<path d="M${80 - w} 80 C${80 - w - 2} 46 ${80 + w + 2} 46 ${80 + w} 80 C${80 + w - 3} 64 ${80 + w - 10} 56 80 56 C${80 - w + 10} 56 ${80 - w + 3} 64 ${80 - w} 80 Z" fill="${cor}" opacity=".7"/>`;
      case "cacheado": return [[64, 52, 7], [72, 45, 8], [82, 43, 8.5], [92, 46, 8], [99, 54, 6.5], [60, 62, 5.5], [101, 63, 5.5], [78, 52, 6]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${cor}"/><circle cx="${x - 1.5}" cy="${y - 1.5}" r="${r / 2.6}" fill="${c}" opacity=".5"/>`).join("");
      case "black": return `<path d="M${80 - w - 2} 74 C${80 - w} 58 ${80 + w} 58 ${80 + w + 2} 74 C${80 + w - 6} 66 ${80 - w + 6} 66 ${80 - w - 2} 74 Z" fill="${cor}"/>`;
      case "penteado": return topo(60) + `<path d="M${80 - 9} 47 C${80 - 4} 56 ${80 + 10} 58 ${80 + w + 1} 70" stroke="${e}" stroke-width="1.3" fill="none" opacity=".7"/><path d="M62 52 Q74 44 92 47" stroke="${c}" stroke-width="2" fill="none" opacity=".5"/>`;
      case "baguncado": return topo(60) + [[62, 52], [70, 46], [80, 44], [90, 46], [98, 52]].map(([x, y], i) => `<path d="M${x - 5} ${y + 6} L${x + (i % 2 ? 3 : -2)} ${y - 6} L${x + 5} ${y + 6} Z" fill="${cor}"/>`).join("");
      case "longo_franja": return `<path d="M${80 - w - 2} 86 C${80 - w - 4} 44 ${80 + w + 4} 44 ${80 + w + 2} 86 C${80 + w - 2} 66 ${80 + w - 14} 58 ${80 - 6} 58 C${80 - 14} 62 ${80 - w + 4} 70 ${80 - w - 2} 86 Z" fill="${cor}"/>` +
        `<path d="M${80 - w - 2} 86 C${80 - w - 6} 110 ${80 - w - 6} 130 ${80 - w - 2} 150 L${80 - w + 3} 150 C${80 - w} 126 ${80 - w} 104 ${80 - w + 2} 90 Z" fill="${cor}"/>` +
        `<path d="M${80 + w + 2} 86 C${80 + w + 6} 110 ${80 + w + 6} 130 ${80 + w + 2} 150 L${80 + w - 3} 150 C${80 + w} 126 ${80 + w} 104 ${80 + w - 2} 90 Z" fill="${cor}"/><path d="M66 54 Q80 48 96 56" stroke="${c}" stroke-width="2" fill="none" opacity=".5"/>`;
      case "chanel": return `<path d="M${80 - w - 2} 92 C${80 - w - 4} 44 ${80 + w + 4} 44 ${80 + w + 2} 92 C${80 + w - 2} 70 ${80 + w - 8} 62 ${80 + w - 14} 60 C${80} 66 ${80 - w + 6} 64 ${80 - w + 2} 74 C${80 - w} 80 ${80 - w - 1} 86 ${80 - w - 2} 92 Z" fill="${cor}"/><path d="M64 54 Q80 46 98 54" stroke="${c}" stroke-width="2.4" fill="none" opacity=".55"/>`;
      case "rabo": return topo(59) + `<path d="M60 54 Q78 45 100 55" stroke="${c}" stroke-width="2" fill="none" opacity=".5"/>`;
      case "coque_cacheado": return topo(59) + [[66, 54], [76, 49], [88, 50], [96, 56]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${cor}"/>`).join("") +
        `<path d="M${80 - w} 82 c-3 6 -1 12 2 16" stroke="${cor}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      default: return topo(60);
    }
  }

  // ---------- o rosto ----------
  function rosto(p, u) {
    const w = p.w, j = p.queixo || 0, pele = p.pele, sp = escuro(pele, 0.16), lp = claro(pele, 0.12);
    const forma = `M${80 - w} 80 C${80 - w} 50 ${80 + w} 50 ${80 + w} 80 C${80 + w} ${98 + j * 3} ${80 + w * 0.56} ${116 + j} 80 ${119 + j} C${80 - w * 0.56} ${116 + j} ${80 - w} ${98 + j * 3} ${80 - w} 80 Z`;
    const defs = `<radialGradient id="${u}r" cx=".42" cy=".38" r=".75"><stop offset="0" stop-color="${lp}"/><stop offset=".65" stop-color="${pele}"/><stop offset="1" stop-color="${sp}"/></radialGradient>`;
    let s = `<rect x="70" y="104" width="20" height="40" rx="6" fill="${sp}"/><path d="M70 128 Q80 136 90 128 L90 144 L70 144 Z" fill="${escuro(pele, 0.22)}" opacity=".5"/>`; // o pescoço
    s += `<ellipse cx="${80 - w}" cy="88" rx="5" ry="9" fill="${pele}"/><ellipse cx="${80 + w}" cy="88" rx="5" ry="9" fill="${pele}"/><path d="M${80 - w - 1} 84 q-2 4 0 8" stroke="${sp}" stroke-width="1.2" fill="none"/>`;
    s += `<path d="${forma}" fill="url(#${u}r)"/><path d="M${80 + w - 4} 74 C${80 + w - 1} 92 ${80 + w * 0.5} 112 80 ${117 + j}" stroke="${sp}" stroke-width="3" fill="none" opacity=".35"/>`;
    // as sobrancelhas, os olhos, o nariz e a boca
    const ol = p.sono ? 0.55 : 1, ys = p.sono ? 77 : 75;
    for (const lado of [-1, 1]) {
      const x = 80 + lado * 11.5;
      s += `<path d="M${x - 7 * lado} ${ys + (lado < 0 ? 1 : 0)} Q${x} ${ys - 3.5} ${x + 7 * lado} ${ys + 0.5}" stroke="${p.sobr}" stroke-width="${p.mulher ? 1.8 : 2.6}" fill="none" stroke-linecap="round"/>`;
      s += `<ellipse cx="${x}" cy="85" rx="6" ry="${3.6 * ol}" fill="#fbfbf8"/><circle cx="${x + 0.5}" cy="85" r="${2.8 * Math.min(1, ol + 0.2)}" fill="${p.olhos}"/><circle cx="${x + 0.5}" cy="85" r="1.3" fill="#0d0a08"/>` +
        `<circle cx="${x + 1.5}" cy="83.8" r=".8" fill="#fff"/><path d="M${x - 6.3} ${85 - 0.4} Q${x} ${85 - 4.6 * ol} ${x + 6.3} ${85 - 0.4}" stroke="${escuro(pele, 0.55)}" stroke-width="1.3" fill="none"/>` +
        (p.mulher ? `<path d="M${x + 5.6 * lado} ${83.6} l${1.8 * lado} -1.4" stroke="#1a1310" stroke-width=".9"/>` : "");
      if (p.sono) s += `<path d="M${x - 5} 89 Q${x} 91 ${x + 5} 89" stroke="${sp}" stroke-width="1" fill="none" opacity=".7"/>`;
    }
    s += `<path d="M80 86 C79 92 77 96 76 99 Q80 102 84 99" stroke="${escuro(pele, 0.3)}" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="80" cy="96" rx="3" ry="2" fill="${lp}" opacity=".6"/>`;
    if (p.rugas) s += `<path d="M64 72 q4 -2 8 0 M88 72 q4 -2 8 0 M66 96 q2 6 6 8 M94 96 q-2 6 -6 8" stroke="${sp}" stroke-width=".9" fill="none" opacity=".7"/>`;
    if (p.sardas) s += [[68, 93], [71, 95], [74, 92], [86, 92], [89, 95], [92, 93]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".8" fill="#b9663e" opacity=".55"/>`).join("");
    if (p.mulher) s += `<ellipse cx="66" cy="96" rx="5" ry="3" fill="#e46b6b" opacity=".18"/><ellipse cx="94" cy="96" rx="5" ry="3" fill="#e46b6b" opacity=".18"/>`;
    const labio = p.mulher ? "#b4535a" : escuro(pele, 0.35);
    switch (p.boca) {
      case "riso": s += `<path d="M70 104 Q80 115 90 104 Q80 108 70 104 Z" fill="#fff"/><path d="M70 104 Q80 115 90 104" stroke="${labio}" stroke-width="1.6" fill="none"/>`; break;
      case "sorriso": s += `<path d="M71 105 Q80 111 89 105" stroke="${labio}" stroke-width="${p.mulher ? 2.4 : 1.8}" fill="none" stroke-linecap="round"/>`; break;
      case "curiosa": s += `<path d="M72 106 Q80 109 88 105" stroke="${labio}" stroke-width="${p.mulher ? 2.4 : 1.8}" fill="none" stroke-linecap="round"/>`; break;
      case "sonolento": s += `<path d="M73 107 Q80 106 87 107" stroke="${labio}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`; break;
      case "serio": s += `<path d="M71 107 Q80 105.5 89 107" stroke="${labio}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`; break;
      default: s += `<path d="M72 106 Q80 108 88 106" stroke="${labio}" stroke-width="${p.mulher ? 2.4 : 1.8}" fill="none" stroke-linecap="round"/>`;
    }
    if (p.barba) {
      const [b, c] = p.barba;
      if (b === "rala") s += `<path d="M${80 - w + 3} 92 C${80 - w + 4} 110 ${80 - 8} ${118 + j} 80 ${119 + j} C${80 + 8} ${118 + j} ${80 + w - 4} 110 ${80 + w - 3} 92 C${80 + w - 8} 104 ${80 + 8} 110 80 111 C${80 - 8} 110 ${80 - w + 8} 104 ${80 - w + 3} 92 Z" fill="${c}" opacity=".32"/>`;
      if (b === "cheia" || b === "cheia_curta") s += `<path d="M${80 - w + 1} 88 C${80 - w + 2} 112 ${80 - 10} ${122 + j} 80 ${123 + j} C${80 + 10} ${122 + j} ${80 + w - 2} 112 ${80 + w - 1} 88 C${80 + w - 6} 104 ${80 + 10} 108 80 109 C${80 - 10} 108 ${80 - w + 6} 104 ${80 - w + 1} 88 Z" fill="${c}" opacity="${b === "cheia" ? 0.95 : 0.7}"/>` +
        `<path d="M71 104 Q80 100 89 104" stroke="${c}" stroke-width="3" fill="none" opacity="${b === "cheia" ? 0.95 : 0.7}"/>`;
      if (b === "bigode") s += `<path d="M70 103 Q75 99 80 101 Q85 99 90 103 Q85 102 80 103 Q75 102 70 103 Z" fill="${c}"/>`;
    }
    return { defs, s };
  }

  // ---------- os acessórios ----------
  function acessorios(p, u, onde) {
    const w = p.w, a = new Set(p.acess || []);
    let s = "";
    if (onde === "rosto") {
      if (a.has("oculos") || a.has("oculos_finos")) {
        const fino = a.has("oculos_finos"), cor = fino ? "#8a8a8a" : "#1b1b1f";
        s += `<g stroke="${cor}" stroke-width="${fino ? 1 : 1.8}" fill="#ffffff" fill-opacity=".08"><rect x="61" y="79" width="16" height="11" rx="3"/><rect x="83" y="79" width="16" height="11" rx="3"/></g><path d="M77 83 Q80 81 83 83 M61 82 L${80 - w} 80 M99 82 L${80 + w} 80" stroke="${cor}" stroke-width="${fino ? 1 : 1.6}" fill="none"/>`;
      }
      if (a.has("oculos_redondos")) s += `<g stroke="#5a3a20" stroke-width="1.4" fill="#ffffff" fill-opacity=".08"><circle cx="68.5" cy="85" r="7.5"/><circle cx="91.5" cy="85" r="7.5"/></g><path d="M76 84 Q80 82 84 84 M61 84 L${80 - w} 82 M99 84 L${80 + w} 82" stroke="#5a3a20" stroke-width="1.2" fill="none"/>`;
      if (a.has("brincos")) s += `<circle cx="${80 - w}" cy="98" r="2.2" fill="#e8c35a"/><circle cx="${80 + w}" cy="98" r="2.2" fill="#e8c35a"/>`;
      if (a.has("ponto")) s += `<path d="M${80 + w + 2} 90 q3 8 -2 18 q-4 10 2 24" stroke="#d9d9d9" stroke-width="1.2" fill="none"/><circle cx="${80 + w + 1}" cy="89" r="2" fill="#2b2b2b"/>`;
      if (a.has("celular")) s += `<g transform="rotate(-12 ${80 + w + 4} 96)"><rect x="${80 + w - 2}" y="78" width="11" height="22" rx="2.5" fill="#1d1d24" stroke="#4a4a58"/></g>` +
        `<path d="M${80 + w + 14} 140 C${80 + w + 16} 122 ${80 + w + 12} 106 ${80 + w + 6} 100 L${80 + w - 2} 104 C${80 + w + 2} 112 ${80 + w + 4} 124 ${80 + w + 2} 140 Z" fill="${p.pele}"/>`;
    } else {
      if (a.has("corrente")) s += `<path d="M66 146 Q80 168 94 146" stroke="#e8c35a" stroke-width="2.4" fill="none" stroke-dasharray="2.5 1.2"/><circle cx="80" cy="160" r="3" fill="#e8c35a"/>`;
      if (a.has("cracha")) s += `<path d="M68 146 L76 178 M92 146 L84 178" stroke="#2f6fd6" stroke-width="2.2"/><rect x="72" y="176" width="16" height="20" rx="2" fill="#f4f6fa"/><rect x="74" y="179" width="12" height="4" fill="#2f6fd6"/><rect x="74" y="186" width="9" height="2" fill="#9aa4b4"/>`;
      if (a.has("headset")) s += `<path d="M58 140 C58 124 102 124 102 140" stroke="#1c1c24" stroke-width="5" fill="none"/><rect x="50" y="134" width="12" height="16" rx="5" fill="#22222e" stroke="#8f6bff" stroke-width="1.4"/><rect x="98" y="134" width="12" height="16" rx="5" fill="#22222e" stroke="#8f6bff" stroke-width="1.4"/>`;
      if (a.has("microfone")) s += `<g transform="rotate(-18 128 176)"><rect x="124" y="160" width="8" height="44" rx="3" fill="#1a1a1f"/><rect x="118" y="164" width="20" height="14" rx="2" fill="#2f6fd6"/><text x="128" y="174" font-size="7" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">TV</text>` +
        `<circle cx="128" cy="150" r="11" fill="#3a3a44"/><circle cx="128" cy="150" r="11" fill="url(#${u}m)"/></g>`;
    }
    return s;
  }

  // ---------- o retrato inteiro ----------
  function svg(id, { tam = 160, titulo = "" } = {}) {
    const p = P[id];
    if (!p) return "";
    const u = "rt" + (++serie) + id.replace(/[^A-Za-z]/g, "").slice(0, 6);
    const f = fundo(p.fundo, u), r = rosto(p, u);
    const malha = `<pattern id="${u}m" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".8" fill="#888"/></pattern>`;
    const vinheta = `<radialGradient id="${u}v" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>`;
    return `<svg class="rtc-retrato" viewBox="0 0 160 200" width="${tam}" height="${Math.round(tam * 1.25)}" role="img" aria-label="${(titulo || p.papel).replace(/"/g, "&quot;")}">` +
      `<defs>${f.defs}${r.defs}${malha}${vinheta}</defs>${f.corpo}` +
      cabeloAtras(p.cabelo, p.w) + roupa(p.roupa, p.pele, u) + r.s + cabeloFrente(p.cabelo, p.w) + acessorios(p, u, "rosto") + acessorios(p, u, "corpo") +
      `<rect width="160" height="200" fill="url(#${u}v)"/></svg>`;
  }
  window.Retratos = { svg, tem: (id) => !!P[id], papel: (id) => P[id]?.papel || "", PERSONAGENS: P };
})();
