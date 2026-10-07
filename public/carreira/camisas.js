// Carreira de Treinador: a camisa de cada clube (servidor e navegador). O escudo (escudos.js) não diz como é a camisa:
// as listras do escudo dos grandes europeus são enfeite, e o Liverpool não joga de listrado. Aqui fica a camisa de verdade:
// [cor, detalhe, desenho, calção]. Desenho: "" lisa, l listras verticais, h aros, c faixa vertical no meio, f faixa
// horizontal, d faixa diagonal, m metade de cada cor, x xadrez (o mesmo de Rostos.listra).
// Clube que não está aqui: os brasileiros usam as listras do próprio escudo (que já seguem a camisa); os outros, a camisa
// lisa nas cores do clube.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Camisas = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const B = "#ffffff", P = "#111111";
  const TABELA = {
    // Premier League
    arsenal: ["#ef0107", B, "", B], "aston-villa": ["#670e36", "#95bfe5", "", B], "afc-bournemouth": ["#d71920", P, "l", P], brentford: ["#e30613", B, "l", P],
    brighton: ["#0057b8", B, "l", "#0057b8"], burnley: ["#6c1d45", "#99d6ea", "", B], chelsea: ["#034694", B, "", "#034694"], "crystal-palace": ["#1b458f", "#c4122e", "l", "#1b458f"],
    everton: ["#003399", B, "", B], fulham: [B, P, "", P], "leeds-united": [B, "#1d428a", "", B], liverpool: ["#c8102e", B, "", "#c8102e"],
    "manchester-city": ["#6cabdd", B, "", B], "manchester-united": ["#da291c", B, "", B], "newcastle-utd": [P, B, "l", P], "nottingham-forest": ["#dd0000", B, "", B],
    sunderland: ["#eb172b", B, "l", P], tottenham: [B, "#132257", "", "#132257"], "west-ham": ["#7a263a", "#1bb1e7", "", B], wolves: ["#fdb913", P, "", P],
    // La Liga
    alaves: ["#0057b8", B, "l", "#0057b8"], "athletic-club": ["#ee2523", B, "l", P], "atletico-de-madrid": ["#d71920", B, "l", "#1d2d6b"], "ca-osasuna": ["#d91a21", "#0a2a5a", "", "#0a2a5a"],
    "celta-de-vigo": ["#8ac3ee", B, "", B], "elche-cf": [B, "#05642c", "f", B], "fc-barcelona": ["#a50044", "#004d98", "l", "#004d98"], "getafe-cf": ["#005999", B, "", "#005999"],
    "girona-fc": ["#d71920", B, "l", "#d71920"], "levante-ud": ["#004d98", "#a50044", "l", "#004d98"], "rayo-vallecano": [B, "#e53027", "d", B], "rcd-espanyol": ["#007fc8", B, "l", "#007fc8"],
    "rcd-mallorca": ["#d71920", P, "", P], "real-betis": ["#00954c", B, "l", "#00954c"], "real-madrid": [B, "#febe10", "", B], "real-oviedo": ["#0057b8", B, "", B],
    "real-sociedad": ["#0067b1", B, "l", B], "sevilla-fc": [B, "#d71920", "", B], "valencia-cf": [B, P, "", P], "villarreal-cf": ["#ffe667", "#005187", "", "#ffe667"],
    // Serie A
    "as-roma": ["#8e1f2f", "#f0bc42", "", B], atalanta: ["#1e71b8", P, "l", P], bologna: ["#a21c26", "#1a2f48", "l", B], cagliari: ["#a21c26", "#1a2f48", "m", "#1a2f48"],
    como: ["#005bac", B, "", "#005bac"], cremonese: ["#d71920", "#b0b0b0", "l", B], fiorentina: ["#482e92", B, "", "#482e92"], genoa: ["#a31d2c", "#1d2d6b", "m", B],
    "hellas-verona": ["#003b7a", "#ffd100", "", "#003b7a"], "inter-de-milao": ["#0068a8", P, "l", P], juventus: [B, P, "l", B], lazio: ["#87d8f7", B, "", B],
    lecce: ["#d71920", "#ffd100", "l", "#1d2d6b"], milan: ["#d71920", P, "l", B], parma: [B, P, "c", B], pisa: [P, "#005bac", "l", P],
    sassuolo: ["#00a752", P, "l", "#00a752"], "ssc-napoli": ["#12a0d7", B, "", B], torino: ["#7a263a", B, "", B], udinese: [B, P, "l", P],
    // Bundesliga
    "1-fc-koln": [B, "#e30613", "", B], "1-fsv-mainz-05": ["#e30613", B, "", B], "bayer-leverkusen": ["#e32221", P, "", P], "borussia-dortmund": ["#fde100", P, "", P],
    "borussia-monchengladbach": [B, P, "", B], "eintracht-frankfurt": [P, "#e1000f", "", P], "fc-augsburg": [B, "#ba3733", "", B], "fc-bayern-munchen": ["#dc052d", B, "", "#dc052d"],
    "fc-st-pauli": ["#6f4e37", B, "", "#6f4e37"], "hamburger-sv": [B, "#0a3f86", "", "#e30613"], heidenheim: ["#e30613", "#003b7a", "", "#003b7a"], "rb-leipzig": [B, "#dd0741", "", B],
    "sc-freiburg": [P, "#e30613", "", P], "sv-werder-bremen": ["#1d9053", B, "", "#1d9053"], "tsg-hoffenheim": ["#005bac", B, "", "#005bac"], "union-berlin": ["#e30613", B, "", B],
    "vfb-stuttgart": [B, "#e32219", "f", B], "vfl-wolfsburg": ["#65b32e", B, "", B],
    // Ligue 1
    "aj-auxerre": [B, "#005bac", "", B], "angers-sco": [P, B, "l", P], "as-monaco": ["#e30613", B, "d", B], "fc-lorient": ["#f58113", P, "", P],
    "fc-metz": ["#7a263a", B, "", "#7a263a"], "fc-nantes": ["#fcd405", "#00843d", "", "#fcd405"], "havre-ac": ["#8ac3ee", "#1d2d6b", "m", "#1d2d6b"], "losc-lille": ["#e01e13", "#1d2d6b", "", "#1d2d6b"],
    lyon: [B, "#005bac", "", B], "ogc-nice": ["#d71920", P, "l", P], "olympique-de-marseille": [B, "#2faee0", "", B], "paris-fc": ["#1d2d6b", B, "", "#1d2d6b"],
    "paris-saint-germain": ["#004170", "#da291c", "c", "#004170"], "rc-lens": ["#ffd100", "#d71920", "", P], "stade-brestois-29": ["#e30613", B, "", B], "stade-rennais-fc": ["#d71920", P, "", P],
    strasbourg: ["#005bac", B, "", B], "toulouse-fc": ["#5b2c83", B, "", "#5b2c83"],
    // Argentina e os outros sul-americanos
    "river-plate": [B, "#d71920", "d", P], "boca-juniors": ["#103f79", "#ffd100", "f", "#103f79"], "racing-club-argentina": ["#6bb7d6", B, "l", P], estudiantes: ["#d71920", B, "l", P],
    "velez-sarsfield": [B, "#005bac", "d", B], talleres: ["#1d2d6b", B, "l", "#1d2d6b"], nacional: [B, "#1d2d6b", "", "#1d2d6b"], penarol: ["#ffd100", P, "l", P],
    "colo-colo": [B, P, "", P], "atletico-nacional": ["#00843d", B, "l", B], libertad: [B, P, "l", P], "universidad-de-chile": ["#0033a0", "#d71920", "", B],
    bolivar: ["#6bb7d6", B, "", B], "alianza-lima": ["#1d2d6b", B, "l", "#1d2d6b"], olimpia: [B, P, "f", P], universitario: ["#f3ead4", "#7a263a", "", P],
    "sporting-cristal": ["#6bb7d6", B, "", B], "cerro-porteno": ["#1d2d6b", "#d71920", "l", "#1d2d6b"], "barcelona-sc": ["#ffd100", P, "", P], "ldu-quito": [B, "#d71920", "", B],
    "independiente-del-valle": [P, "#005bac", "l", P], bucaramanga: ["#ffd100", "#00843d", "", "#00843d"], "deportivo-tachira": ["#ffd100", P, "l", P], "carabobo-fc": ["#7a263a", B, "", B],
    "san-antonio": ["#005bac", B, "", B], "racing-club-uruguai": ["#00843d", B, "l", B],
  };
  // [cor, detalhe, desenho, calção] da camisa do clube (c: o clube da base)
  function de(c) {
    if (!c) return ["#3a4a5a", "#dde4ea", "", "#1a1a1a"];
    if (TABELA[c.id]) return TABELA[c.id];
    const [cor, det] = c.cores;
    const l = c.liga === "brasileirao-2026" && c.escudo && c.escudo.listras ? c.escudo.listras[0] : "";
    const desenho = l === "v" || l === "v-topo" ? "l" : l === "h" || l === "h-baixo" ? "h" : l === "d" ? "d" : "";
    const claro = (hx) => { const n = parseInt(hx.slice(1), 16); return 0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255); };
    return [cor, det, desenho, claro(cor) > 200 ? "#1a1a1a" : claro(cor) < 50 ? "#1a1a1a" : "#f4f4f4"];
  }
  return { de, TABELA };
});
