// Corrida da Galera — o desenho do capacete de cada piloto de 2026 (os 22 de f1-pilotos-2026.js) e o desenho genérico (na cor da equipe) de quem não está
// no mapa: a galera, o carro de segurança. Só as cores principais e o jeito geral (onde ficam o topo, as faixas, as laterais e a faixa da viseira) INSPIRADOS
// nos capacetes de verdade; nada de logotipo, marca nem bandeira desenhada. Referências: planetf1.com/news/f1-driver-helmets-2026-season (cores e
// motivos de cada piloto) e, para Hamilton, Verstappen, Leclerc e Russell, as reportagens de lançamento dos capacetes de 2026 (redbull.com, simracingonline.co.uk,
// motorsport.com). As cores são lidas dessas descrições e ajustadas à mão; o jeito de cada desenho é uma das sete famílias abaixo.
//
// A folha é de 512x256 e envolve a cabeça: x em volta (a frente em 384, as costas em 128, os lados em 0/512 e 256), y da coroa (0) ao queixo (256). A viseira
// (f1-piloto.js) ocupa y de 98 a 127 e x = 384 ± 94, então esse pedaço fica só com o casco por baixo; a faixa do patrocínio entra logo acima.
// `cores`: [casco, segunda cor, terceira cor (filetes, detalhes)].
export const CAPACETES = {
  norris: { cores: ["#c4f31a", "#101114", "#d9ae2e"], desenho: "faixa" },       // verde-neon e preto, uma estrelinha dourada
  piastri: { cores: ["#f2c10f", "#d62a2a", "#1d3f9a"], desenho: "bandas" },     // amarelo, vermelho e azul
  leclerc: { cores: ["#e6002b", "#f2f2f2", "#101114"], desenho: "blocos" },     // vermelho e branco em blocos
  hamilton: { cores: ["#f4d22c", "#d6001c", "#101114"], desenho: "faixa" },     // amarelo com detalhes vermelhos
  russell: { cores: ["#6fc6f0", "#101114", "#f2f2f2"], desenho: "faixa" },      // azul-celeste com detalhes pretos
  antonelli: { cores: ["#f2f2f2", "#e10600", "#4aa8e8"], desenho: "blocos" },   // branco, vermelho, azul-celeste, verde e preto em camadas
  verstappen: { cores: ["#1e3d96", "#d3202a", "#f2f2f2"], desenho: "cruz" },    // azul, vermelho e branco; cruz vermelha e faixa azul em volta
  hadjar: { cores: ["#f6d117", "#5b2a86", "#101114"], desenho: "topo" },        // amarelo, roxo e preto
  lawson: { cores: ["#f4f4f4", "#ff5fa8", "#b6bcc6"], desenho: "faixa" },       // branco e rosa, prata
  lindblad: { cores: ["#a8ff00", "#2b6ce6", "#e23030"], desenho: "triangulos" },// neon, azuis e vermelho
  alonso: { cores: ["#3aa6e0", "#d2192e", "#f6c90e"], desenho: "bandas" },      // azul-claro, vermelho e amarelo
  stroll: { cores: ["#17191d", "#4a4f57", "#229971"], desenho: "asas" },        // preto fosco, "asas" cinza ao lado da viseira
  albon: { cores: ["#e7ebef", "#1868db", "#aeb4bb"], desenho: "topo" },         // branco cromado, azul no topo, prata
  sainz: { cores: ["#d2192e", "#f6c90e", "#1c4fa3"], desenho: "bandas" },       // vermelho e amarelo com azul
  hulkenberg: { cores: ["#e8e4da", "#b3b7bd", "#ff7a1a"], desenho: "faixa" },   // cinza-claro no meio, laranja, off-white nos lados
  bortoleto: { cores: ["#1fa64a", "#ffd400", "#f4f4f4"], desenho: "asas" },     // verde e amarelo, "asas" douradas, faixa branca
  gasly: { cores: ["#1f56d8", "#f4f4f4", "#e0242f"], desenho: "faixa" },        // azul, uma faixa branca e vermelha
  colapinto: { cores: ["#74c0ec", "#f4f4f4", "#e0364a"], desenho: "triangulos" },// azul-claro e branco, triângulos no topo
  ocon: { cores: ["#d0102a", "#a30a1f", "#f4f4f4"], desenho: "topo" },          // todo vermelho, o topo mais escuro
  bearman: { cores: ["#2a4fd6", "#c4f31a", "#f4f4f4"], desenho: "faixa" },      // azul, neon e branco
  perez: { cores: ["#a8ff00", "#17191d", "#d2192e"], desenho: "asas" },         // neon, preto e vermelho
  bottas: { cores: ["#15171b", "#2f6fdb", "#8a909a"], desenho: "blocos" },      // preto, azul e dois cinzas
};
// o capacete do robô pela sigla do piloto (NOR, PIA...): null = desenho genérico
export function capacetePorSigla(sigla) {
  const lista = (typeof window !== "undefined" && window.F1Pilotos?.PILOTOS) || [], p = sigla && lista.find((q) => q.sigla === sigla);
  return p ? CAPACETES[p.id] || null : null;
}

const LADOS = [0, 256, 512];
const poli = (x, pts, cor) => { x.fillStyle = cor; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
// uma fita larga e curva em cada lado da cabeça: sobe do queixo (na frente) até a nuca, afinando nas pontas (cx: o centro do lado na folha; no lado direito, cx = 256, as costas ficam à esquerda; no esquerdo, à direita)
function fita(x, cx, cor, topo = 78, larg = 56) {
  const d = cx === 256 ? -1 : 1, X = (v) => cx + d * v; // d = para onde ficam as costas
  x.fillStyle = cor; x.beginPath();
  x.moveTo(X(-128), 236); x.bezierCurveTo(X(-60), 214, X(40), 168, X(132), topo); // a borda de cima: do queixo à nuca
  x.bezierCurveTo(X(136), topo + larg * 0.9, X(70), topo + larg + 66, X(-10), 214 + larg * 0.4); x.bezierCurveTo(X(-70), 240, X(-110), 252, X(-128), 236); x.closePath(); x.fill();
}
const filete = (x, cx, cor, topo = 78) => { const d = cx === 256 ? -1 : 1, X = (v) => cx + d * v; x.strokeStyle = cor; x.lineWidth = 6; x.lineCap = "round"; x.beginPath(); x.moveTo(X(-128), 228); x.bezierCurveTo(X(-60), 206, X(40), 160, X(132), topo - 6); x.stroke(); };
const calota = (x, cor, ate = 66, fil) => { x.fillStyle = cor; x.fillRect(0, 0, 512, ate); if (fil) { x.fillStyle = fil; x.fillRect(0, ate - 2, 512, 7); } }; // o topo: uma cor só em volta da coroa (sem faixas que se juntem no alto)

const DESENHOS = {
  // o genérico (a galera e quem não está no mapa): topo na cor 2 com filete, uma fita larga de cor 2 em cada lado e o queixo de cor 2
  generico(x, [c1, c2, c3]) {
    calota(x, c2, 66, c3);
    for (const cx of LADOS) { fita(x, cx, c2); filete(x, cx, c3); }
    x.fillStyle = c2; x.fillRect(0, 226, 512, 30);
  },
  // o topo e a fita larga de cor 2 e o filete de cor 3
  faixa(x, [c1, c2, c3]) {
    calota(x, c2, 62, c3);
    for (const cx of LADOS) { fita(x, cx, c2, 82, 64); filete(x, cx, c3, 82); }
    x.fillStyle = c2; x.fillRect(0, 230, 512, 26);
  },
  // o topo de outra cor com a borda recortada e uma fita fina de cor 3 nos lados
  topo(x, [c1, c2, c3]) {
    x.fillStyle = c2; x.beginPath(); x.moveTo(0, 0); x.lineTo(512, 0); x.lineTo(512, 70);
    for (let i = 16; i >= 0; i--) x.lineTo(i * 32, 70 + (i % 2 ? 0 : 20));
    x.closePath(); x.fill();
    for (const cx of LADOS) fita(x, cx, c3, 100, 34);
    x.fillStyle = c2; x.fillRect(0, 226, 512, 30);
  },
  // faixas horizontais em volta da cabeça (como uma bandeira): em cima e embaixo na cor 2, o meio é o casco, filetes de cor 3
  bandas(x, [c1, c2, c3]) {
    x.fillStyle = c2; x.fillRect(0, 0, 512, 70); x.fillRect(0, 170, 512, 86);
    x.fillStyle = c3; x.fillRect(0, 70, 512, 8); x.fillRect(0, 162, 512, 8);
  },
  // uma cruz: o topo de cor 2, uma tira em volta (cor 3) no meio do casco e uma fita de cor 2 nos lados
  cruz(x, [c1, c2, c3]) {
    calota(x, c2, 56);
    x.fillStyle = c3; x.fillRect(0, 150, 512, 22);
    for (const cx of LADOS) fita(x, cx, c2, 92, 40);
  },
  // dois blocos de cor: a parte de cima no casco, a de baixo na cor 2, com a divisão inclinada e um filete de cor 3, e o topo de cor 3
  blocos(x, [c1, c2, c3]) {
    poli(x, [[0, 176], [512, 122], [512, 256], [0, 256]], c2); x.strokeStyle = c3; x.lineWidth = 8; x.beginPath(); x.moveTo(0, 170); x.lineTo(512, 116); x.stroke();
    calota(x, c3, 48);
  },
  // "asas" de cor 2 de cada lado da viseira, o topo de cor 2 e a faixa de cor 3 no queixo
  asas(x, [c1, c2, c3]) {
    calota(x, c2, 50);
    poli(x, [[214, 146], [290, 104], [320, 94], [304, 126], [236, 176]], c2); poli(x, [[554, 146], [478, 104], [448, 94], [464, 126], [532, 176]], c2);
    for (const cx of LADOS) fita(x, cx, c2, 96, 36);
    x.fillStyle = c3; x.fillRect(0, 232, 512, 24);
  },
  // o topo com recortes triangulares e fitas de pontas em triângulo nos lados (um desenho mais "quebrado")
  triangulos(x, [c1, c2, c3]) {
    calota(x, c2, 60);
    for (let i = 0; i < 16; i++) { const a = i * 32; poli(x, [[a, 60], [a + 32, 60], [a + 16, 84]], c3); }
    for (const cx of LADOS) { const d = cx === 256 ? -1 : 1; poli(x, [[cx - d * 110, 220], [cx + d * 10, 120], [cx + d * 40, 226]], c2); poli(x, [[cx - d * 40, 232], [cx + d * 90, 150], [cx + d * 120, 236]], c3); }
    x.fillStyle = c2; x.fillRect(0, 232, 512, 24);
  },
};

// pinta a folha inteira: o casco, o desenho e o que todo capacete tem (a faixa do patrocínio acima da viseira, o filete embaixo e o número)
export function pintarFolha(x, cores, desenho, numero) {
  const [c1, c2, c3] = cores;
  x.fillStyle = c1; x.fillRect(0, 0, 512, 256);
  (DESENHOS[desenho] || DESENHOS.generico)(x, cores);
  x.fillStyle = c3; x.fillRect(282, 85, 204, 11); // a faixa estreita do patrocínio / nome logo acima da viseira (só cor)
  if (numero != null && numero !== "") {
    x.font = "900 54px 'Arial Black', Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round"; x.lineWidth = 7;
    for (const [cx, cy] of [[128, 168], [256, 172], [0, 172], [512, 172]]) { x.strokeStyle = "#0b0c10"; x.strokeText(String(numero), cx, cy); x.fillStyle = "#ffffff"; x.fillText(String(numero), cx, cy); }
  }
}
