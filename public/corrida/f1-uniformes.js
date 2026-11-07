// Corrida da Galera — o macacão de cada equipe, na festa do pódio (podio-pilotos.js). As cores e as marcas são as que o jogo já usa no carro
// (f1-pintura.js e f1-marcas.js: nenhuma marca nova) e o jeito de cada macacão vem do uniforme real quando há referência (ver `UNIFORMES`).
// A folha é a do modelo do piloto (1024x1024), com a sombra das dobras e a máscara das faixas guardadas sem os logos (ferramentas/podio-pilotos.mjs):
// o fundo leva a cor da equipe, a máscara leva a cor da faixa, os recortes e as marcas entram por cima e a sombra multiplica tudo.
import { desenharMarca } from "./f1-marcas.js";

export const TAM_FOLHA = 1024;
// `base`: o macacão; `faixa`: o que era branco (ombros, faixa do braço e da perna); `costas`: as costas, se diferem da frente; `lado`: a faixa do lado do tronco;
// `botas`, `luva`: as outras peças; `peito`: a marca maior; `cinto`, `perna`, `braco`: as marcas menores; `tinta`: a cor das letras.
// Referências de 2026: Ferrari (vermelho, branco no pescoço, nos ombros e nas laterais), McLaren (papaia na frente, antracito atrás, número grande) e Racing Bulls
// (azul e branco), nas reportagens de lançamento. As outras oito seguem a pintura do carro de 2026 do jogo.
export const UNIFORMES = {
  mclaren: { base: "#f47600", faixa: "#17181c", costas: "#3d4047", lado: "#17181c", luva: "#f47600", botas: "#17181c", tinta: "#101114", peito: "okx", cinto: "dhl", perna: "gemini", braco: "dell" },
  ferrari: { base: "#c8101c", faixa: "#f2f1ec", lado: "#f2f1ec", luva: "#c8101c", botas: "#c8101c", tinta: "#ffffff", peito: "hp", cinto: "shell", perna: "unicredit", braco: "ibm" },
  mercedes: { base: "#101216", faixa: "#00bda9", lado: "#c8cdd3", luva: "#00bda9", botas: "#101216", tinta: "#ffffff", peito: "petronas", cinto: "ineos", perna: "teamviewer", braco: "crowdstrike" },
  "red-bull": { base: "#141c42", faixa: "#d3112f", lado: "#f7b500", luva: "#d3112f", botas: "#141c42", tinta: "#ffffff", peito: "redbull", cinto: "oracle", perna: "mobil1", braco: "rokt" },
  "racing-bulls": { base: "#eff1f6", faixa: "#1b49c9", lado: "#d3112f", luva: "#1b49c9", botas: "#14224f", tinta: "#14224f", peito: "visa", cinto: "cashapp", perna: "hugo", braco: "redbull" },
  "aston-martin": { base: "#0a4a3f", faixa: "#cedc00", lado: "#062d27", luva: "#cedc00", botas: "#0a1210", tinta: "#ffffff", peito: "aramco", cinto: "coinbase", perna: "valvoline", braco: "boss" },
  williams: { base: "#0f2f8f", faixa: "#f2f5fb", lado: "#3d7be0", luva: "#3d7be0", botas: "#08184f", tinta: "#ffffff", peito: "atlassian", cinto: "komatsu", perna: "barclays", braco: "duracell" },
  audi: { base: "#2c2f35", faixa: "#e8391a", lado: "#aeb3b8", luva: "#e8391a", botas: "#0d0e11", tinta: "#ffffff", peito: "revolut", cinto: "nexo", perna: "ninjaone", braco: "visitqatar" },
  alpine: { base: "#0c1f5c", faixa: "#ff6fb1", lado: "#2a6fd6", luva: "#ff6fb1", botas: "#071338", tinta: "#ffffff", peito: "bwt", cinto: "alpine", perna: "msc", braco: "eni" },
  haas: { base: "#f0f0ee", faixa: "#e10a2b", lado: "#141416", luva: "#141416", botas: "#141416", tinta: "#141416", peito: "toyota", cinto: "haas", perna: "zoomex", braco: "gr" },
  cadillac: { base: "#0e0f12", faixa: "#eef0f2", lado: "#c9a227", luva: "#c9a227", botas: "#0e0f12", tinta: "#ffffff", peito: "cadillac", cinto: "ifs", perna: "twg", braco: "claro" },
};

const clara = (hex) => { const n = parseInt(String(hex).slice(1), 16); return 0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255) > 150; };
// quem não tem equipe (as salas sem regras de equipe, a "Sua cor"): o macacão na cor do carro, com a faixa branca ou preta
export function uniformeDe(equipe, cor = "#e10600") {
  if (UNIFORMES[equipe]) return UNIFORMES[equipe];
  const c = /^#[0-9a-f]{6}$/i.test(cor) ? cor : "#e10600", cf = clara(c) ? "#14161a" : "#f2f2f2";
  return { base: c, faixa: cf, lado: cf, luva: cf, botas: "#14161a", tinta: cf };
}

// uma marca centrada em (x, y), de altura h. A folha do corpo é espelhada de cima para baixo (a cabeça fica no y maior): todo desenho sai com o y invertido.
function marca(c, id, x, y, h, tinta, giro = 0, fundo) {
  if (!id) return;
  c.save(); c.translate(x, y); c.rotate(giro); c.scale(h, -h);
  try { desenharMarca(c, id, { tinta, fundo }); } catch (e) { /* marca sem desenho: fica sem */ }
  c.restore();
}
// o número grande, como nas costas de verdade
function numero(c, n, x, y, h, cor, borda) {
  if (n == null || n === "") return;
  c.save(); c.translate(x, y); c.scale(1, -1); c.font = `900 ${h}px 'Arial Black', Arial, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round"; c.lineWidth = h * 0.1; c.strokeStyle = borda; c.strokeText(String(n), 0, 0); c.fillStyle = cor; c.fillText(String(n), 0, 0); c.restore();
}

// a folha do macacão. `folhas`: { trajeSombra, trajeMascara } (imagens); `dados`: { numero, logo (imagem, ou null), sigla }
export function pintarTraje(canvas, u, folhas, dados = {}) {
  const x = canvas.getContext("2d"), T = TAM_FOLHA;
  x.save(); x.globalCompositeOperation = "source-over"; x.fillStyle = u.base; x.fillRect(0, 0, T, T);
  // as costas (os dois lados de fora da folha do tronco)
  if (u.costas) { x.fillStyle = u.costas; x.fillRect(0, 0, 150, 690); x.fillRect(530, 0, 150, 690); }
  // o que era branco leva a cor da faixa: pinta numa tela à parte, recortada pela máscara
  const m = document.createElement("canvas"); m.width = m.height = T; const xm = m.getContext("2d");
  xm.drawImage(folhas.trajeMascara, 0, 0, T, T); xm.globalCompositeOperation = "source-in"; xm.fillStyle = u.faixa; xm.fillRect(0, 0, T, T);
  xm.globalCompositeOperation = "source-atop"; xm.fillStyle = u.lado || u.faixa; xm.fillRect(150, 0, 90, 360); xm.fillRect(440, 0, 90, 360); // a faixa do lado do tronco
  xm.fillStyle = u.botas; xm.fillRect(400, 505, 280, 250); // o que era branco na bota
  x.drawImage(m, 0, 0);
  // o peito: a marca principal e o logo da equipe
  marca(x, u.peito, 332, 356, 44, u.tinta);
  if (dados.logo) { x.save(); x.translate(268, 270); x.scale(1, -1); x.globalAlpha = 0.95; x.drawImage(dados.logo, -30, -30, 60, 60); x.restore(); }
  marca(x, u.cinto, 332, 150, 30, u.tinta);
  // as pernas, ao longo da faixa, e os braços
  marca(x, u.perna, 797, 160, 22, clara(u.faixa) ? "#14161a" : "#ffffff", Math.PI / 2);
  marca(x, u.perna, 798, 850, 22, clara(u.faixa) ? "#14161a" : "#ffffff", Math.PI / 2);
  marca(x, u.braco, 205, 892, 22, clara(u.faixa) ? "#14161a" : "#ffffff");
  marca(x, u.braco, 515, 892, 22, clara(u.faixa) ? "#14161a" : "#ffffff");
  // o número nas costas: cada metade das costas é um lado da folha, e o número fica na de um lado só
  numero(x, dados.numero, 112, 300, 84, clara(u.costas || u.base) ? "#14161a" : "#ffffff", clara(u.costas || u.base) ? "#ffffff" : "#000000");
  // a sombra das dobras por cima de tudo, bem mais leve que a original (ela foi feita para um fundo vermelho saturado)
  x.globalCompositeOperation = "multiply"; x.globalAlpha = 0.6; x.drawImage(folhas.trajeSombra, 0, 0, T, T);
  x.restore();
}

// a folha das luvas: o que era vermelho ou azul leva a cor da luva; o preto e o couro claro ficam
export function pintarLuvas(canvas, u, folhas) {
  const x = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
  x.save(); x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
  const m = document.createElement("canvas"); m.width = W; m.height = H; const xm = m.getContext("2d");
  xm.drawImage(folhas.luvasMascara, 0, 0, W, H); xm.globalCompositeOperation = "source-in"; xm.fillStyle = u.luva; xm.fillRect(0, 0, W, H);
  x.drawImage(m, 0, 0); x.globalCompositeOperation = "multiply"; x.drawImage(folhas.luvasSombra, 0, 0, W, H); x.restore();
}
