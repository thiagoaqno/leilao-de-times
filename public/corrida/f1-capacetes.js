// Corrida da Galera — o desenho do capacete de cada piloto de 2026 (os 22 de f1-pilotos-2026.js) e o desenho genérico (na cor da equipe) de quem não está
// no mapa: a galera, o carro de segurança. Só as cores principais e o jeito geral (onde ficam o topo, as faixas, as laterais e a faixa da viseira) INSPIRADOS
// nos capacetes de verdade; nada de logotipo, marca nem bandeira desenhada. Referências: planetf1.com/news/f1-driver-helmets-2026-season (cores e
// motivos de cada piloto) e, para Hamilton, Verstappen, Leclerc e Russell, as reportagens de lançamento dos capacetes de 2026 (redbull.com, simracingonline.co.uk,
// motorsport.com). As cores são lidas dessas descrições e ajustadas à mão; o jeito de cada desenho é uma das sete famílias abaixo.
//
// A folha é de 512x256 e envolve a cabeça: x em volta (a frente em 384, as costas em 128, os lados em 0/512 e 256), y da coroa (0) ao queixo (256). A viseira
// (f1-piloto.js) ocupa y de 90 a 128 e x = 384 ± 85, então esse pedaço fica só com o casco por baixo; a faixa do patrocínio entra logo acima e o filete embaixo.
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
const linha = (x, pts, cor, larg) => { x.strokeStyle = cor; x.lineWidth = larg; x.lineCap = "round"; x.lineJoin = "round"; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); };

const DESENHOS = {
  // o genérico (a galera e quem não está no mapa): casco na cor 1, topo na cor 2, faixa da frente às costas, onda de cor 2 nos lados, queixo de cor 2
  generico(x, [c1, c2, c3]) {
    x.fillStyle = c2; x.fillRect(0, 0, 512, 66); x.fillStyle = c3; x.fillRect(0, 64, 512, 7);
    for (const cx of [128, 384]) x.fillRect(cx - 17, 0, 34, 66);
    for (const cx of LADOS) { poli(x, [[cx - 105, 196], [cx - 20, 142], [cx + 105, 92], [cx + 105, 142], [cx - 10, 192], [cx - 105, 246]], c2); linha(x, [[cx - 105, 206], [cx - 20, 152], [cx + 105, 102]], c3, 6); }
    x.fillStyle = c2; x.fillRect(0, 214, 512, 42);
  },
  // uma faixa larga da frente às costas (casco de outra cor por cima) e uma onda de cor 2 nas laterais
  faixa(x, [c1, c2, c3]) {
    for (const cx of [128, 384]) { x.fillStyle = c2; x.fillRect(cx - 30, 0, 60, 90); x.fillStyle = c3; x.fillRect(cx - 38, 0, 6, 90); x.fillRect(cx + 32, 0, 6, 90); }
    for (const cx of LADOS) { poli(x, [[cx - 110, 150], [cx + 10, 112], [cx + 110, 70], [cx + 110, 112], [cx + 10, 162], [cx - 110, 214]], c2); linha(x, [[cx - 110, 162], [cx + 10, 124], [cx + 110, 82]], c3, 5); }
    x.fillStyle = c2; x.fillRect(0, 222, 512, 34);
  },
  // o topo de outra cor, filete e uma onda de cor 3 pelos lados
  topo(x, [c1, c2, c3]) {
    x.fillStyle = c2; x.fillRect(0, 0, 512, 72); x.fillStyle = c3; x.fillRect(0, 72, 512, 6);
    for (const cx of [128, 384]) { x.fillStyle = c3; x.fillRect(cx - 12, 0, 24, 72); }
    for (const cx of LADOS) linha(x, [[cx - 110, 214], [cx - 10, 168], [cx + 110, 120]], c3, 14);
    x.fillStyle = c2; x.fillRect(0, 226, 512, 30);
  },
  // faixas horizontais em volta da cabeça (como uma bandeira): em cima e embaixo na cor 2, o meio é o casco, filetes de cor 3
  bandas(x, [c1, c2, c3]) {
    x.fillStyle = c2; x.fillRect(0, 0, 512, 72); x.fillRect(0, 168, 512, 88);
    x.fillStyle = c3; x.fillRect(0, 72, 512, 8); x.fillRect(0, 160, 512, 8);
    for (const cx of [128, 384]) { x.fillStyle = c3; x.fillRect(cx - 10, 0, 20, 72); }
  },
  // uma cruz: a faixa da frente às costas por cima (cor 2) e uma tira em volta (cor 3) no meio do casco
  cruz(x, [c1, c2, c3]) {
    x.fillStyle = c3; x.fillRect(0, 150, 512, 22);
    for (const cx of [128, 384]) { x.fillStyle = c2; x.fillRect(cx - 28, 0, 56, 256); x.fillStyle = c3; x.fillRect(cx - 34, 0, 5, 256); x.fillRect(cx + 29, 0, 5, 256); }
    x.fillStyle = c2; x.fillRect(0, 0, 512, 34);
  },
  // dois blocos de cor: a parte de cima no casco, a de baixo na cor 2, com a divisão inclinada e um filete de cor 3
  blocos(x, [c1, c2, c3]) {
    poli(x, [[0, 176], [512, 122], [512, 256], [0, 256]], c2); linha(x, [[0, 170], [512, 116]], c3, 8);
    poli(x, [[0, 0], [190, 0], [150, 70], [0, 70]], c3); poli(x, [[322, 0], [512, 0], [512, 70], [362, 70]], c3);
    x.fillStyle = c2; x.fillRect(0, 0, 512, 12);
  },
  // "asas" de cor 2 de cada lado da viseira, o topo e uma faixa fina de cor 3
  asas(x, [c1, c2, c3]) {
    for (const cx of [384]) {
      poli(x, [[cx - 170, 140], [cx - 92, 100], [cx - 60, 92], [cx - 80, 124], [cx - 150, 170]], c2); poli(x, [[cx + 170, 140], [cx + 92, 100], [cx + 60, 92], [cx + 80, 124], [cx + 150, 170]], c2);
    }
    for (const cx of [128, 256, 0, 512]) poli(x, [[cx - 90, 160], [cx + 10, 120], [cx + 100, 90], [cx + 70, 140], [cx - 20, 190]], c2);
    x.fillStyle = c2; x.fillRect(0, 0, 512, 40);
    for (const cx of [128, 384]) { x.fillStyle = c3; x.fillRect(cx - 8, 0, 16, 76); }
    x.fillStyle = c3; x.fillRect(0, 232, 512, 24);
  },
  // triângulos de cores diferentes no topo e em volta (um desenho mais "quebrado")
  triangulos(x, [c1, c2, c3]) {
    for (let i = 0; i < 16; i++) { const a = i * 32; poli(x, [[a, 0], [a + 32, 0], [a + 16, 60]], i % 2 ? c2 : c3); poli(x, [[a, 60], [a + 32, 60], [a + 16, 0]], i % 2 ? c3 : c2); }
    x.fillStyle = c2; x.fillRect(0, 62, 512, 6);
    for (const cx of LADOS) { poli(x, [[cx - 100, 200], [cx - 20, 130], [cx + 60, 200]], c2); poli(x, [[cx - 20, 200], [cx + 60, 130], [cx + 140, 200]], c3); }
    x.fillStyle = c2; x.fillRect(0, 226, 512, 30);
  },
};

// pinta a folha inteira: o casco, o desenho e o que todo capacete tem (a faixa do patrocínio acima da viseira, o filete embaixo e o número)
export function pintarFolha(x, cores, desenho, numero) {
  const [c1, c2, c3] = cores;
  x.fillStyle = c1; x.fillRect(0, 0, 512, 256);
  (DESENHOS[desenho] || DESENHOS.generico)(x, cores);
  x.fillStyle = c3; x.fillRect(284, 76, 200, 12); x.fillStyle = c1; for (let i = 0; i < 12; i++) x.fillRect(290 + i * 16, 80.5, 9, 3); // a faixa do patrocínio (traços miúdos, de longe parece escrita)
  x.fillStyle = c3; x.fillRect(290, 131, 188, 5); // o filete embaixo da viseira
  if (numero != null && numero !== "") {
    x.font = "900 54px 'Arial Black', Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round"; x.lineWidth = 7;
    for (const [cx, cy] of [[128, 168], [256, 172], [0, 172], [512, 172]]) { x.strokeStyle = "#0b0c10"; x.strokeText(String(numero), cx, cy); x.fillStyle = "#ffffff"; x.fillText(String(numero), cx, cy); }
  }
}
