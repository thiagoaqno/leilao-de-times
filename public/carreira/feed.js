// Carreira de Treinador: o feed de notícias, com cara de rede social. Cada post (que vem pronto do servidor, em
// carreira-feed.js) tem o perfil, a arte em pixel-art desenhada aqui (uma cena por tipo de notícia, num canvas de 96x96
// ampliado sem borrar), as curtidas, a legenda e os comentários. A arte sai da semente do post: a mesma notícia tem
// sempre a mesma arte. Curtir fica guardado no navegador (carreira:curtidas).
const ARTE = 96;
const artes = new Map(); // id do post -> dataURL da arte
const K = Lances.kit;
const sorteArte = (txt) => K.sorteio("arte:" + txt);
const SVG_FEED = {
  curtir: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>',
  comentar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.5a8.5 8 0 0 1-12.4 7.1L3.5 20l1.4-4.2A8 8 0 1 1 20.5 11.5z"/></svg>',
  enviar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/></svg>',
  salvar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-6-4.5-6 4.5z"/></svg>',
  verificado: '<svg viewBox="0 0 24 24" class="verificado" aria-label="Verificado"><path d="M12 2.5l2.4 1.8 3-.2.9 2.8 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.8-3-.2L12 21.5l-2.4-1.8-3 .2-.9-2.8-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.8 3 .2z"/><path d="m8 12 2.7 2.7L16.5 9" fill="none" stroke="#fff" stroke-width="2"/></svg>',
};

// ---------- as peças da arte ----------
const P = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.globalAlpha = 1; g.fillRect(Math.round(x), Math.round(y), w, h); };
const coresDe = (clube) => (CLUBES[clube] ? CLUBES[clube].cores : ["#3a4a5a", "#dde4ea"]);
const pessoa = (pid, clube) => K.figura(pid ? (JOGADORES[pid] || {}).nome || "Jogador" : "torcedor " + clube, uniformeDoClube(clube || E.clube));
const genera = (nome, u) => K.figura(nome, u);
const TERNO = { cam: "#1d2533", det: "#f4f4f4", desenho: "", calcao: "#1d2533", meiao: "#1d2533", chuteira: "#141414" };
const JUIZ = { cam: "#141414", det: "#f4f4f4", desenho: "", calcao: "#141414", meiao: "#141414", chuteira: "#141414" };
const BRANCO = { cam: "#f4f4f4", det: "#d62828", desenho: "", calcao: "#f4f4f4", meiao: "#f4f4f4", chuteira: "#f4f4f4" };
// texto em pixel (as letras 3x5 do lances.js), com escala
function letras(g, txt, x, y, c, esc = 1) {
  g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(esc, esc); g.fillStyle = c;
  K.escreve(g, String(txt).toUpperCase().normalize("NFD").replace(/[^A-Z0-9]/g, ""), 0, 0, false); g.restore();
}
const larguraTexto = (txt, esc = 1) => String(txt).replace(/[^A-Za-z0-9]/g, "").length * 4 * esc - esc;
// o escudo em pixel: o formato de brasão nas cores do clube, com a sigla
function brasao(g, clube, x, y, esc = 1) {
  const [a, b] = coresDe(clube), sig = (CLUBES[clube] || {}).curto || "GAL";
  const linhas = [14, 16, 16, 16, 16, 16, 16, 15, 14, 12, 10, 8, 6, 4];
  linhas.forEach((w, i) => { P(g, "#0e1310", x + (16 - w) / 2 * esc - esc, y + i * esc - esc, (w + 2) * esc, esc * 2); });
  linhas.forEach((w, i) => { P(g, i % 4 < 2 ? a : b, x + (16 - w) / 2 * esc, y + i * esc, w * esc, esc); });
  P(g, "#0e1310", x + 1 * esc, y + 3 * esc, 14 * esc, 7 * esc); // a faixa escura da sigla
  letras(g, sig.slice(0, 3), x + (16 * esc - larguraTexto(sig.slice(0, 3), esc)) / 2, y + 4 * esc, "#ffffff", esc);
}
function ceu(g, r, noite) {
  const c = noite ? ["#0d1730", "#1a2850"] : [["#62b0ee", "#a9d8f7"], ["#ff9a5c", "#ffd29a"], ["#7cc4f0", "#d2ecfb"]][Math.floor(r() * 3)];
  for (let y = 0; y < ARTE; y++) P(g, y < ARTE / 2 ? c[0] : c[1], 0, y, ARTE, 1);
}
function gramado(g, y0) { for (let y = y0; y < ARTE; y++) P(g, Math.floor((y - y0) / 6) % 2 ? "#3f8f3a" : "#4a9c43", 0, y, ARTE, 1); }
function arquibancada(g, r, cores, y0 = 18, alto = 34, pula = 0) {
  P(g, "#0e1712", 0, y0, ARTE, alto);
  const peles = ["#f6d3b5", "#e6b48a", "#c68b5e", "#9c6640"];
  for (let fil = 0; fil < alto / 5 - 1; fil++) for (let x = (fil & 1) * 2; x < ARTE; x += 4) {
    if (r() < 0.12) continue;
    const y = y0 + 2 + fil * 5 - (pula && (x + fil) % 3 === 0 ? 1 : 0);
    P(g, peles[Math.floor(r() * 4)], x, y); P(g, cores[Math.floor(r() * cores.length)], x - 0.5, y + 1, 2, 2);
  }
}
const flashes = (g, r, n = 8) => { for (let k = 0; k < n; k++) { const x = r() * ARTE, y = r() * 40; P(g, "#ffffff", x, y, 2, 2); P(g, "#ffffff88", x - 1, y + 0.5, 4, 1); } };
const confete = (g, r, cores) => { for (let k = 0; k < 40; k++) P(g, cores[k % cores.length], r() * ARTE, r() * ARTE, 2, 1); };
const chuva = (g, r) => { P(g, "#45566655", 0, 0, ARTE, ARTE); for (let k = 0; k < 60; k++) P(g, "#d9e8f5aa", r() * ARTE, r() * ARTE, 1, 3); };
// o boneco do kit (corpo inteiro) com os pés em (x, y)
const boneco = (g, fig, pose, x, y, esc = 1, vira = false, deitado = 0) => K.poe(g, fig, { ...K.P0, ...pose }, x, y, esc, 0, vira, deitado);
const BRACOS_ALTO = { bE: [-160, -175], bD: [160, 175] };

// ---------- as cenas (uma por tipo de notícia) ----------
const CENAS_FEED = {
  apresentacao(g, a, r) { // o técnico novo com o cachecol, na frente do painel de patrocínio
    for (let y = 0; y < ARTE; y++) P(g, y % 16 < 8 ? "#e8ecef" : "#dfe4e8", 0, y, ARTE, 1);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) brasao(g, a.clube, 6 + i * 24, 4 + j * 24, 1);
    P(g, "#ffffffaa", 0, 0, ARTE, ARTE);
    const [c1, c2] = coresDe(a.clube), t = genera("Técnico", TERNO);
    boneco(g, t, { bE: [-150, -170], bD: [150, 170], ol: 0 }, 48, 92, 2);
    for (let x = 18; x < 78; x += 4) P(g, (x / 4) % 2 ? c1 : c2, x, 6 + Math.abs(x - 48) * 0.12, 4, 4); // o cachecol esticado, por cima da cabeça
    flashes(g, r, 10);
  },
  contratacao(g, a, r) { // o reforço segurando a camisa nova, flashes da imprensa
    for (let y = 0; y < ARTE; y++) P(g, "#1b2430", 0, y, ARTE, 1);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) brasao(g, a.clube, 6 + i * 24, 4 + j * 24, 1);
    P(g, "#1b243099", 0, 0, ARTE, ARTE);
    boneco(g, pessoa(a.jogador, a.clube), { bE: [-110, -150], bD: [110, 150], ol: 0 }, 48, 94, 2);
    const [c1, c2] = coresDe(a.clube), cy = 52; P(g, "#0e1310", 26, cy - 1, 44, 22); P(g, c1, 27, cy, 42, 20); P(g, c2, 45, cy, 6, 20); P(g, "#ffffff", 44, cy + 4, 8, 6); letras(g, "10", 44, cy + 5, c1); // a camisa aberta na frente do peito
    flashes(g, r, 14);
  },
  aperto(g, a, r) { // o aperto de mãos entre os dois clubes e a placa com o valor
    for (let y = 0; y < ARTE; y++) P(g, y < 62 ? "#2a3646" : "#4b3a2a", 0, y, ARTE, 1);
    brasao(g, a.de, 8, 8, 1); brasao(g, a.para, 72, 8, 1);
    letras(g, ">", 44, 12, "#ffb21e"); P(g, "#ffb21e", 30, 14, 34, 1); P(g, "#ffb21e", 60, 12, 2, 5);
    boneco(g, pessoa(null, a.de), { bD: [80, 95], ol: 1 }, 34, 90, 1.6);
    boneco(g, pessoa(a.jogador, a.para), { bD: [80, 95], ol: 1 }, 62, 90, 1.6, true);
    const v = a.valor >= 1e6 ? `${Math.round(a.valor / 1e5) / 10}M` : `${Math.round(a.valor / 1e3)}K`;
    P(g, "#0e1310", 26, 26, 44, 11); P(g, "#ffd76a", 27, 27, 42, 9); letras(g, v.replace(".", ""), 48 - larguraTexto(v.replace(".", "")) / 2, 29, "#2a1d05");
  },
  vitoria(g, a, r) { placar(g, a, r, "bom"); },
  empate(g, a, r) { placar(g, a, r, "neutro"); },
  derrota(g, a, r) { placar(g, a, r, "ruim"); },
  gol(g, a, r) { // o artilheiro comemorando, papel picado
    ceu(g, r, r() < 0.5); arquibancada(g, r, coresDe(a.clube).concat("#f4f4f4"), 22, 30, 1); gramado(g, 52);
    boneco(g, pessoa(a.jogador, a.clube), { ...BRACOS_ALTO, sobe: 4, pE: [-30, -60], pD: [20, 10] }, 48, 92, 2);
    confete(g, r, [...coresDe(a.clube), "#ffffff", "#ffd21f"]);
    if (a.gols >= 3) { P(g, "#141414", 30, 2, 36, 12); letras(g, "HAT", 36, 5, "#ffd21f", 2); }
  },
  lesao(g, a, r) { // no chão, com o médico e a maleta
    ceu(g, r); arquibancada(g, r, coresDe(a.clube), 16, 24); gramado(g, 40);
    boneco(g, pessoa(a.jogador, a.clube), { bE: [-150, -170], bD: [150, 170] }, 40, 72, 1.6, false, 90);
    boneco(g, genera("medico", BRANCO), { bD: [60, 120], ag: 4, pE: [-60, -90] }, 70, 92, 1.6, true);
    P(g, "#f4f4f4", 50, 78, 12, 9); P(g, "#d62828", 55, 79, 2, 7); P(g, "#d62828", 52, 82, 8, 2);
  },
  cartao(g, a, r) { // o juiz levanta o cartão
    ceu(g, r); arquibancada(g, r, coresDe(a.clube), 16, 30); gramado(g, 46);
    boneco(g, genera("juiz", JUIZ), { bD: [172, 176], ol: 1 }, 34, 94, 2);
    P(g, "#141414", 39, 4, 12, 16); P(g, a.cor === "vermelho" ? "#e0281c" : "#ffd21f", 40, 5, 10, 14);
    boneco(g, pessoa(a.jogador, a.clube), { bE: [-150, -40], bD: [150, 40], ol: -1 }, 72, 94, 1.6, true);
  },
  tabela(g, a, r) { // a tabela com a linha do clube acesa
    P(g, "#0f1a26", 0, 0, ARTE, ARTE);
    P(g, "#ffb21e", 6, 6, 84, 12); letras(g, "TABELA", 10, 9, "#2a1d05", 1.4);
    const pos = a.posicao || 1, ini = Math.max(1, Math.min(16, pos - 2));
    for (let k = 0; k < 5; k++) {
      const n = ini + k, meu = n === pos, y = 24 + k * 13;
      P(g, meu ? coresDe(a.clube)[0] : k % 2 ? "#1b2a3a" : "#16222f", 6, y, 84, 11);
      P(g, n === 1 ? "#ffd21f" : n <= 4 ? "#3ecf8e" : n >= 17 ? "#ff5b4a" : "#8a99a8", 6, y, 3, 11);
      letras(g, String(n), 12, y + 3, "#ffffff"); if (meu) brasao(g, a.clube, 70, y - 1, 0.75); else P(g, "#ffffff33", 24, y + 5, 30 + ((n * 7) % 20), 2);
    }
  },
  contrato(g, a, r) { // o contrato, a caneta e as pilhas de moedas
    P(g, "#3b2a1c", 0, 0, ARTE, ARTE); for (let y = 0; y < ARTE; y += 8) P(g, "#33241a", 0, y, ARTE, 1);
    P(g, "#0e1310", 15, 9, 50, 66); P(g, "#f6f0dc", 16, 10, 48, 64);
    for (let y = 18; y < 60; y += 5) P(g, "#b9b19a", 21, y, 38 - ((y * 3) % 12), 1);
    brasao(g, a.clube, 40, 56, 0.9); P(g, "#2a2a2a", 20, 66, 18, 1);
    P(g, "#1a1a1a", 50, 46, 3, 26); P(g, "#ffd21f", 50, 44, 3, 3);
    for (const [x, n] of [[70, 6], [80, 9], [62, 4]]) for (let k = 0; k < n; k++) { P(g, "#8a6a12", x, 86 - k * 3, 10, 3); P(g, "#ffd21f", x, 86 - k * 3, 10, 2); }
  },
  imprensa(g, a, r) { // os microfones na frente do painel
    for (let y = 0; y < ARTE; y++) P(g, "#e8ecef", 0, y, ARTE, 1);
    for (let i = 0; i < 4; i++) brasao(g, a.clube, 6 + i * 24, 6, 1);
    boneco(g, a.jogador ? pessoa(a.jogador, a.clube) : genera("Técnico", TERNO), { ol: 0 }, 48, 96, 2);
    const cores = ["#d62828", "#2b6bd6", "#1f8a5b", "#ffb21e", "#7a3fc0"];
    cores.forEach((c, k) => { const x = 14 + k * 16, y = 60 + (k % 2) * 6; P(g, "#141414", x + 3, y + 6, 2, 30); P(g, "#141414", x - 1, y - 1, 10, 9); P(g, c, x, y, 8, 7); P(g, "#ffffff", x + 2, y + 2, 4, 1); });
  },
  torcida(g, a, r) { CENAS_FEED.festa(g, a, r); }, // (festa sozinho seria o confete de inicio.js)
  festa(g, a, r) { // a arquibancada pulando, bandeiras e sinalizador
    ceu(g, r, true); arquibancada(g, r, coresDe(a.clube).concat("#f4f4f4"), 10, 86, 1);
    const [c1, c2] = coresDe(a.clube);
    for (const x of [16, 52, 80]) { P(g, "#cfcfcf", x, 6, 1, 26); P(g, c1, x + 1, 6, 14, 5); P(g, c2, x + 1, 11, 14, 5); }
    for (let k = 0; k < 30; k++) { P(g, `rgba(255,${80 + Math.floor(r() * 80)},40,${0.3 + r() * 0.5})`, 30 + r() * 30, 20 + r() * 40, 3, 3); }
    P(g, "#ff3b1f", 44, 56, 4, 4); P(g, "#ffd21f", 45, 57, 2, 2);
  },
  protesto(g, a, r) { // faixas pretas na frente do CT, céu cinza
    ceu(g, r); chuva(g, r);
    P(g, "#6d6d6d", 0, 40, ARTE, 30); for (let x = 0; x < ARTE; x += 12) P(g, "#5a5a5a", x, 40, 1, 30);
    P(g, "#141414", 8, 18, 80, 16); letras(g, "RACA", 22, 21, "#ffffff", 2);
    arquibancada(g, r, ["#141414", "#2a2a2a", coresDe(a.clube)[0]], 70, 26);
  },
  treino(g, a, r) { // cones no gramado do CT e o jogador correndo
    ceu(g, r); P(g, "#2c5f2a", 0, 30, ARTE, 6); gramado(g, 36);
    for (let k = 0; k < 6; k++) { const x = 8 + k * 15, y = 62 + (k % 2) * 10; P(g, "#ff7a1a", x + 2, y, 2, 2); P(g, "#ff7a1a", x + 1, y + 2, 4, 2); P(g, "#ff7a1a", x, y + 4, 6, 2); P(g, "#ffffff", x + 1, y + 3, 4, 1); }
    boneco(g, pessoa(a.jogador, a.clube), K.corre(250 + r() * 200), 50, 90, 1.8);
  },
  vestiario(g, a, r) { // os armários com as camisas
    P(g, "#2b2f36", 0, 0, ARTE, ARTE);
    const [c1, c2] = coresDe(a.clube);
    for (let k = 0; k < 4; k++) {
      const x = 4 + k * 23; P(g, "#55606e", x, 8, 21, 60); P(g, "#3e4651", x + 1, 9, 19, 58);
      P(g, c1, x + 4, 18, 13, 16); P(g, c2, x + 9, 18, 3, 16); P(g, c1, x + 1, 18, 4, 6); P(g, c1, x + 16, 18, 4, 6); letras(g, String([7, 9, 10, 11][k]), x + 6, 24, "#ffffff");
    }
    P(g, "#7b5a3a", 0, 72, ARTE, 6); P(g, "#5c4029", 0, 78, ARTE, 18);
    if (a.jogador) boneco(g, pessoa(a.jogador, a.clube), { ol: 0 }, 72, 96, 1.4);
  },
  balada(g, a, r) { // luz de festa, globo e o flagra
    P(g, "#120a22", 0, 0, ARTE, ARTE);
    for (let k = 0; k < 6; k++) { g.fillStyle = ["#ff2bd6", "#2bd6ff", "#ffe12b"][k % 3]; g.globalAlpha = 0.25; g.beginPath(); g.moveTo(48, 10); g.lineTo(k * 20 - 10, ARTE); g.lineTo(k * 20 + 6, ARTE); g.fill(); }
    g.globalAlpha = 1; P(g, "#cfd6dd", 47, 0, 1, 6); P(g, "#cfd6dd", 43, 6, 9, 9); for (let k = 0; k < 6; k++) P(g, "#ffffff", 44 + (k % 3) * 3, 7 + Math.floor(k / 3) * 4, 1, 1);
    boneco(g, pessoa(a.jogador, a.clube), { ...BRACOS_ALTO, ol: 1 }, 48, 94, 1.8);
    P(g, "#141414", 70, 60, 20, 30); P(g, "#ff2b2b", 76, 64, 8, 6); letras(g, "REC", 73, 74, "#ffffff");
  },
  selecao(g, a, r) { // com a amarelinha (uma camisa genérica) e a bandeira
    ceu(g, r);
    P(g, "#1f8a3e", 6, 10, 40, 26); g.fillStyle = "#ffd21f"; g.beginPath(); g.moveTo(26, 13); g.lineTo(43, 23); g.lineTo(26, 33); g.lineTo(9, 23); g.fill(); P(g, "#1d3fa8", 21, 18, 10, 10);
    gramado(g, 60);
    boneco(g, K.figura((JOGADORES[a.jogador] || {}).nome || "Jogador", { cam: "#ffd21f", det: "#1f8a3e", desenho: "", calcao: "#1d3fa8", meiao: "#f4f4f4", chuteira: "#141414" }), { bD: [160, 170], ol: 1 }, 62, 94, 2);
  },
  trofeu(g, a, r) { // a taça dourada com brilhinhos
    P(g, "#141d29", 0, 0, ARTE, ARTE);
    for (let k = 0; k < 18; k++) { const x = r() * ARTE, y = r() * ARTE; P(g, "#ffe9a8", x, y, 1, 3); P(g, "#ffe9a8", x - 1, y + 1, 3, 1); }
    const ouro = ["#8a6a12", "#d9a520", "#ffd76a", "#fff3c4"];
    P(g, ouro[0], 32, 18, 32, 4); for (let y = 22; y < 50; y++) { const w = 30 - (y - 22) * 0.6; P(g, ouro[1], 48 - w / 2, y, w, 1); P(g, ouro[2], 48 - w / 2 + 3, y, 4, 1); }
    P(g, ouro[1], 22, 24, 6, 14); P(g, ouro[1], 68, 24, 6, 14); P(g, "#141d29", 25, 27, 3, 8); P(g, "#141d29", 68, 27, 3, 8);
    P(g, ouro[1], 44, 50, 8, 12); P(g, ouro[0], 34, 62, 28, 6); P(g, "#3a2a1a", 30, 68, 36, 10); P(g, ouro[2], 40, 71, 16, 2);
    brasao(g, a.clube, 40, 28, 1);
  },
  bebe(g, a, r) { // o berço e a mamadeira
    P(g, "#bfe3f5", 0, 0, ARTE, ARTE); for (let k = 0; k < 10; k++) P(g, "#ffffff", r() * ARTE, r() * 40, 6, 3);
    P(g, "#8a5a34", 18, 50, 60, 4); P(g, "#8a5a34", 18, 54, 4, 30); P(g, "#8a5a34", 74, 54, 4, 30); for (let x = 26; x < 74; x += 6) P(g, "#a87d48", x, 54, 2, 24);
    P(g, "#ffd3b5", 40, 42, 12, 10); P(g, "#f4f4f4", 34, 50, 26, 6); P(g, "#141414", 43, 45, 1, 1); P(g, "#141414", 48, 45, 1, 1);
    P(g, "#f4f4f4", 78, 30, 8, 14); P(g, "#ff8fb1", 79, 26, 6, 4); P(g, "#bfe3f5", 79, 36, 6, 6);
    brasao(g, a.clube, 6, 6, 1);
  },
  casamento(g, a, r) { // o bolo de três andares
    P(g, "#2a1f2f", 0, 0, ARTE, ARTE); confete(g, r, ["#ffd76a", "#ffffff", "#ff8fb1"]);
    const [c1] = coresDe(a.clube);
    [[20, 70, 56, 16], [28, 54, 40, 16], [36, 40, 24, 14]].forEach(([x, y, w, hh]) => { P(g, "#f6f0dc", x, y, w, hh); P(g, c1, x, y + hh - 3, w, 2); for (let k = x + 3; k < x + w; k += 6) P(g, "#ffffff", k, y, 3, 2); });
    P(g, "#141414", 44, 30, 2, 10); P(g, "#f4f4f4", 50, 30, 2, 10); P(g, "#ffd3b5", 44, 27, 2, 3); P(g, "#ffd3b5", 50, 27, 2, 3);
  },
  carro(g, a, r) { // o carrão esportivo no estacionamento do CT
    ceu(g, r); P(g, "#3a3f47", 0, 60, ARTE, 36); for (let x = 0; x < ARTE; x += 16) P(g, "#ffffff88", x, 76, 8, 1);
    const c = ["#d62828", "#ffd21f", "#f4f4f4", "#141414"][Math.floor(r() * 4)];
    P(g, "#0e1310", 13, 47, 72, 18); P(g, c, 14, 52, 70, 12); P(g, c, 28, 46, 36, 8); P(g, "#9fd3ff", 32, 47, 12, 6); P(g, "#9fd3ff", 46, 47, 14, 6);
    for (const x of [24, 66]) { P(g, "#141414", x - 6, 60, 12, 10); P(g, "#9a9a9a", x - 3, 63, 6, 4); }
    P(g, "#ffe9a8", 80, 54, 4, 3);
  },
  cachorro(g, a, r) { // o vira-lata mascote no gramado
    ceu(g, r); gramado(g, 50);
    const c = ["#c98a4a", "#f4f4f4", "#3a2a1a"][Math.floor(r() * 3)];
    P(g, "#0e1310", 23, 51, 46, 22); P(g, c, 24, 52, 44, 20); P(g, c, 58, 40, 20, 18); P(g, c, 60, 36, 5, 6); P(g, c, 72, 36, 5, 6);
    P(g, "#141414", 66, 46, 2, 2); P(g, "#141414", 74, 50, 4, 3); P(g, "#ff6b8b", 72, 54, 3, 3);
    for (const x of [26, 36, 52, 62]) P(g, c, x, 72, 5, 10); P(g, c, 16, 46, 10, 4);
    P(g, coresDe(a.clube)[0], 58, 56, 20, 3);
  },
  celular(g, a, r) { // o celular com o vídeo bombando
    P(g, "#1d1530", 0, 0, ARTE, ARTE);
    P(g, "#0e0e0e", 26, 6, 44, 84); P(g, "#2a2a2a", 28, 8, 40, 80); P(g, coresDe(a.clube)[0], 30, 12, 36, 60);
    boneco(g, pessoa(a.jogador, a.clube), { ...BRACOS_ALTO }, 48, 70, 1.2);
    for (let k = 0; k < 6; k++) { const x = 72 + (k % 2) * 8, y = 70 - k * 11; P(g, "#ff3b6b", x, y, 3, 2); P(g, "#ff3b6b", x + 4, y, 3, 2); P(g, "#ff3b6b", x, y + 2, 7, 2); P(g, "#ff3b6b", x + 2, y + 4, 3, 2); }
  },
  chuva(g, a, r) { ceu(g, r); arquibancada(g, r, coresDe(a.clube), 18, 28); gramado(g, 46); chuva(g, r); P(g, "#ffffff22", 0, 60, ARTE, 3); },
  sol(g, a, r) { // o sol de rachar no campo
    for (let y = 0; y < ARTE; y++) P(g, y < 50 ? "#ffb347" : "#ffd28a", 0, y, ARTE, 1);
    for (let k = 0; k < 12; k++) { const ang = k * Math.PI / 6; P(g, "#fff3a8", 70 + Math.cos(ang) * 22, 22 + Math.sin(ang) * 22, 3, 3); }
    P(g, "#ffe14d", 58, 10, 24, 24); P(g, "#fff7c4", 62, 14, 8, 8);
    gramado(g, 56); P(g, "#ffffff22", 0, 56, ARTE, ARTE - 56);
    boneco(g, pessoa(null, a.clube), { bE: [-60, -120], bD: [60, 120], ag: 2 }, 34, 92, 1.6);
  },
  aviao(g, a, r) { // o avião entre as nuvens
    ceu(g, r); for (let k = 0; k < 6; k++) { const x = r() * ARTE, y = 30 + r() * 60; P(g, "#ffffff", x, y, 18, 5); P(g, "#ffffff", x + 4, y - 3, 10, 3); }
    P(g, "#0e1310", 15, 39, 66, 12); P(g, "#f4f4f4", 16, 40, 64, 10); P(g, coresDe(a.clube)[0], 16, 46, 64, 2); P(g, "#f4f4f4", 74, 30, 6, 10);
    P(g, "#cfd6dd", 36, 50, 22, 6); for (let x = 26; x < 70; x += 6) P(g, "#5aa7d8", x, 42, 3, 2);
  },
  olheiro(g, a, r) { // o binóculo e o jogador lá longe
    ceu(g, r); arquibancada(g, r, ["#8a99a8", "#5d6b78"], 20, 24); gramado(g, 44);
    boneco(g, pessoa(a.jogador, a.clube), K.corre(300), 64, 70, 1);
    P(g, "#141414", 6, 58, 36, 22); P(g, "#2a2a2a", 8, 60, 14, 18); P(g, "#2a2a2a", 26, 60, 14, 18); P(g, "#9fd3ff", 11, 64, 8, 9); P(g, "#9fd3ff", 29, 64, 8, 9);
  },
  estadio(g, a, r) { // o estádio por fora, com o letreiro
    ceu(g, r, r() < 0.4);
    const [c1, c2] = coresDe(a.clube);
    P(g, "#0e1310", 7, 33, 82, 50); P(g, "#c9ced4", 8, 34, 80, 48); for (let x = 12; x < 86; x += 8) P(g, "#9aa3ad", x, 40, 4, 40);
    P(g, c1, 8, 34, 80, 6); P(g, c2, 8, 40, 80, 2); brasao(g, a.clube, 40, 46, 1);
    P(g, "#3a3f47", 0, 82, ARTE, 14);
  },
  prancheta(g, a, r) { // a prancheta com os X e as bolinhas
    P(g, "#3b2a1c", 0, 0, ARTE, ARTE);
    P(g, "#0e1310", 13, 7, 70, 84); P(g, "#2f6b3a", 14, 10, 68, 80); P(g, "#cfd6dd", 38, 4, 20, 8);
    P(g, "#ffffffaa", 14, 50, 68, 1); for (let k = 0; k < 18; k++) { const x = 20 + ((k * 37) % 58), y = 16 + ((k * 23) % 68); if (k % 2) { P(g, "#ffffff", x, y, 4, 1); P(g, "#ffffff", x + 1.5, y - 1.5, 1, 4); } else P(g, "#ffd21f", x, y, 3, 3); }
    P(g, "#ff5b4a", 30, 30, 20, 1); P(g, "#ff5b4a", 50, 28, 1, 5);
  },
  martelo(g, a, r) { // a disputa: o martelo do leilão e as moedas
    P(g, "#1a1410", 0, 0, ARTE, ARTE); for (let k = 0; k < 20; k++) P(g, "#ffd76a", r() * ARTE, r() * ARTE, 1, 1);
    P(g, "#0e1310", 15, 23, 40, 18); P(g, "#8a5a34", 16, 24, 38, 16); P(g, "#a87d48", 18, 26, 34, 3);
    P(g, "#6b4423", 50, 36, 34, 6); P(g, "#3a2a1a", 22, 78, 52, 10); P(g, "#6b4423", 28, 74, 40, 6);
    for (let k = 0; k < 5; k++) { P(g, "#8a6a12", 70, 70 - k * 3, 12, 3); P(g, "#ffd21f", 70, 70 - k * 3, 12, 2); }
    if (a.jogador) { const img = retratoCanvas(a.jogador); if (img) g.drawImage(img, 6, 50, 32, 32); }
  },
};
// o placar de TV com as duas siglas (e a torcida, feliz ou triste)
function placar(g, a, r, humor) {
  const est = coresDe(a.casa);
  if (humor === "ruim") { ceu(g, r); arquibancada(g, r, ["#5d6b78", "#3d4955", est[0]], 40, 56); chuva(g, r); }
  else { ceu(g, r, r() < 0.5); arquibancada(g, r, [est[0], est[1] || "#f4f4f4", "#f4f4f4"], 40, 56, humor === "bom" ? 1 : 0); if (humor === "bom") confete(g, r, [...est, "#ffd21f"]); }
  P(g, "#0b0f14", 6, 8, 84, 30); P(g, "#1f2a36", 7, 9, 82, 28);
  brasao(g, a.casa, 10, 15, 1); brasao(g, a.fora, 70, 15, 1);
  const txt = `${a.placar[0]}${a.placar[1]}`;
  letras(g, String(a.placar[0]), 32, 16, "#ffd21f", 3); P(g, "#ffd21f", 46, 22, 4, 2); letras(g, String(a.placar[1]), 54, 16, "#ffd21f", 3);
  void txt;
}
// o retrato 16x16 de cartas.js num canvas (para colar na arte)
function retratoCanvas(pid) {
  try { const img = new Image(); img.src = retrato(pid); return img.complete ? img : null; } catch { return null; }
}
function artePost(post) {
  if (artes.has(post.id)) return artes.get(post.id);
  const cv = document.createElement("canvas"); cv.width = ARTE; cv.height = ARTE;
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  const r = sorteArte(post.id), cena = CENAS_FEED[post.arte && post.arte.cena] || CENAS_FEED.vestiario;
  try { cena(g, post.arte || {}, r); } catch (err) { console.warn("arte", post.arte, err); P(g, "#1b2430", 0, 0, ARTE, ARTE); }
  const url = cv.toDataURL(); artes.set(post.id, url); return url;
}

// ---------- o post ----------
const curtidas = () => store.get("carreira:curtidas") || {};
const perfilDe = (p) => (p === "galeranews" ? { nome: "galeranews", oficial: true } : CLUBES[p] ? { nome: CLUBES[p].nome.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, ""), clube: p, oficial: true } : { nome: "galera" });
function avatar(post) {
  const pf = perfilDe(post.perfil);
  return pf.clube ? `<span class="avatar">${escudo(pf.clube, 1)}</span>` : `<span class="avatar gn">GN</span>`;
}
const milhar = (n) => n.toLocaleString("pt-BR");
function postHTML(post, compacto = false) {
  const pf = perfilDe(post.perfil), curti = !!curtidas()[post.id], total = post.curtidas + (curti ? 1 : 0);
  const quem = post.comentarios && post.comentarios[0] ? post.comentarios[0][0] : "torcedor";
  if (compacto) return `<button class="post-mini" data-ir="feed"><img class="pix" src="${artePost(post)}" alt=""><span><b>@${h(pf.nome)}</b><span>${h(post.texto)}</span></span></button>`;
  return `<article class="post" data-post="${h(post.id)}">
    <header>${avatar(post)}<b>@${h(pf.nome)}</b>${pf.oficial ? SVG_FEED.verificado : ""}<small>· R${post.rodada + 1}</small></header>
    <div class="arte"><img class="pix" src="${artePost(post)}" alt="${h(post.arte ? post.arte.cena : "")}"></div>
    <div class="acoes"><button class="curtir" data-curtir="${h(post.id)}" aria-pressed="${curti}" aria-label="Curtir">${SVG_FEED.curtir}</button><button aria-label="Comentar">${SVG_FEED.comentar}</button><button aria-label="Enviar">${SVG_FEED.enviar}</button><button class="salvar" aria-label="Salvar">${SVG_FEED.salvar}</button></div>
    <p class="curtidas">Curtido por <b>@${h(quem)}</b> e outras <b>${milhar(Math.max(0, total - 1))}</b> pessoas</p>
    <p class="legenda"><b>@${h(pf.nome)}</b> ${h(post.texto)}</p>
    ${(post.comentarios || []).length ? `<ul class="comentarios">${post.comentarios.map(([q, t]) => `<li><b>@${h(q)}</b> ${h(t)}</li>`).join("")}</ul>` : ""}
  </article>`;
}
function telaFeed() {
  const posts = E.feed || [];
  $("fLista").innerHTML = posts.length ? posts.map((p) => postHTML(p)).join("") : `<p class="suave vazio">As notícias aparecem aqui depois da primeira rodada.</p>`;
}
// a editoria de cada post (a etiqueta da notícia no hub)
const EDITORIA = { contratacao: "Transferência", venda: "Transferência", vitoria: "Resultado", empate: "Resultado", derrota: "Resultado", campeao: "Taça",
  classificado: "Copa", eliminado: "Copa", tecnico: "Clube", base: "Base", aposentadoria: "Adeus", tabela: "Tabela", gol: "Gol", goleada: "Resultado",
  lesao: "Departamento médico", cartao: "Arbitragem", evento: "Bastidores", disputa: "Rumor" };
const editoriaDe = (p) => EDITORIA[p.tipo] || "Bastidores";
// na sede: as notícias em destaque. A mais nova vira a manchete (a arte grande), e as seguintes, uma grade de cards.
function feedNaSede() {
  const posts = E.feed || [], [manchete, ...resto] = posts;
  const card = (p) => `<button class="noticia" data-ir="feed"><img class="pix" src="${artePost(p)}" alt=""><span><i class="editoria">${h(editoriaDe(p))}</i><b>@${h(perfilDe(p.perfil).nome)}</b><span>${h(p.texto)}</span></span></button>`;
  $("cartaoFeed").innerHTML = `<div class="linha-titulo"><h3>Notícias</h3><button class="link" data-ir="feed">Ver todas</button></div>
    ${manchete ? `<button class="manchete" data-ir="feed"><span class="manchete-arte"><img class="pix" src="${artePost(manchete)}" alt=""></span>
      <span class="manchete-txt"><i class="editoria">${h(editoriaDe(manchete))}</i><b class="manchete-titulo">${h(manchete.texto)}</b>
        <small>@${h(perfilDe(manchete.perfil).nome)} · ${milhar(manchete.curtidas)} curtidas · ${(manchete.comentarios || []).length} comentários</small></span></button>
      ${resto.length ? `<div class="noticias-grade">${resto.slice(0, 6).map(card).join("")}</div>` : ""}` : `<p class="suave">As notícias aparecem aqui depois do primeiro jogo.</p>`}`;
}
// curtir (com o pulinho do coração; com "menos movimento", sem o pulinho)
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-curtir]"); if (!b) return;
  const c = curtidas(), id = b.dataset.curtir;
  if (c[id]) delete c[id]; else c[id] = true;
  store.set("carreira:curtidas", c);
  const post = (E.feed || []).find((p) => p.id === id); if (!post) return;
  const art = b.closest(".post"); art.outerHTML = postHTML(post);
});
document.addEventListener("dblclick", (e) => { // dois toques na arte também curtem
  const a = e.target.closest(".post .arte"); if (!a) return;
  const b = a.closest(".post").querySelector("[data-curtir]"); if (b && b.getAttribute("aria-pressed") !== "true") b.click();
});
