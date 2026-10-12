// SEO: robots.txt, sitemap.xml e as tags de descrição/compartilhamento de cada página.
// O endereço do site vem de SITE_URL (ex.: https://vila.exemplo.com.br); sem ele, usa o endereço do pedido,
// então trocar de domínio não exige mexer no código.
const fs = require("fs");
const path = require("path");

const PUBLIC = path.join(__dirname, "public");

// caminho -> descrição (o título já está em cada index.html)
const PAGINAS = {
  "/": "Vila da Galera: um mapinha pixel-art com jogos para jogar com os amigos no navegador, de graça. Leilão de times, truco, uno, dominó, sinuca, futebol, carreira de treinador e muito mais.",
  "/leilao/": "Leilão da Galera: monte o seu time dos sonhos dando lances com os amigos e veja o campeonato ao vivo.",
  "/carreira/": "Carreira de Treinador: comande um clube de futebol por várias temporadas, sozinho ou em grupo com os amigos, com elencos e ligas do mundo todo.",
  "/jogador/": "Rumo ao Estrelato: comece com um jogador jovem e chegue ao topo, com transferências, prêmios, seleção e histórias.",
  "/banco/": "Banco da Galera: o jogo de tabuleiro de comprar imóveis e cobrar aluguel, online com os amigos.",
  "/uno/": "Uno da Galera: jogue Uno online com os amigos, com robôs completando a mesa.",
  "/kittens/": "Gatinhos Explosivos da Galera: o jogo de cartas de não explodir, de 2 a 5 jogadores online.",
  "/truco/": "Truco da Galera: truco online em duplas, com mesa de feltro e cartas de verdade.",
  "/domino/": "Dominó da Galera: dominó online com os amigos, sala por código.",
  "/ludo/": "Ludo da Galera: o clássico de tabuleiro para até quatro jogadores, online.",
  "/rumi/": "Rumi da Galera: o jogo de peças numeradas clássico, de 2 a 4 jogadores, com robôs.",
  "/proibida/": "Palavra Proibida da Galera: explique a palavra sem dizer as proibidas, em dois times.",
  "/bloqueio/": "Bloqueio: peões e paredes num tabuleiro, de 2 ou 4 jogadores, com robôs.",
  "/sinuca/": "Sinuca da Galera: sinuca online com física de verdade, para jogar com os amigos.",
  "/botao/": "Futebol de Botão da Galera: o futebol de botão de mesa, online.",
  "/corrida/": "Corrida da Galera: corrida de kart em 3D com os amigos, pistas e itens.",
  "/batalha/": "Batalha da Galera: batalha de balões de kart em arenas 3D.",
  "/ginasio/": "Ginásio da Galera: batalhas em tempo real com Galeramon, Pokémon e Naruto, líderes de ginásio e treinadores.",
  "/tiro/": "Tiro da Galera: tiro em primeira pessoa com os amigos e robôs.",
  "/pelada/": "Pelada da Galera: futsal 3D online, com robôs completando o time.",
  "/rocket/": "Rocket da Galera: futebol de carro em arenas 3D, online.",
  "/tenis/": "Tênis da Galera: tênis arcade, simples ou duplas, com robôs.",
  "/pingpong/": "Pingue-Pongue da Galera: tênis de mesa 1x1 com efeito na bola.",
  "/digita/": "Corrida de Digitação da Galera: digite a frase mais rápido que os amigos.",
  "/futevolei/": "Futevôlei da Galera: futevôlei 3D na areia, 1x1 ou duplas.",
};

function site(req) {
  const env = (process.env.SITE_URL || "").replace(/\/+$/, "");
  if (env) return env;
  const proto = (req.get("x-forwarded-proto") || req.protocol).split(",")[0];
  return `${proto}://${req.get("host")}`;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const cache = new Map();

function lerHtml(rota) {
  const arquivo = path.join(PUBLIC, rota === "/rocket/" ? "pelada" : rota, "index.html");
  if (!cache.has(arquivo)) cache.set(arquivo, fs.readFileSync(arquivo, "utf8"));
  return cache.get(arquivo);
}

function tags(rota, base, titulo) {
  const desc = PAGINAS[rota];
  const url = base + rota;
  return [
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Vila da Galera">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:title" content="${esc(titulo)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(base)}/og.png">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join("\n");
}

function ligar(app) {
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain").send(
      ["User-agent: *", "Allow: /", "Disallow: /api/", "Disallow: /vendor/", "", `Sitemap: ${site(req)}/sitemap.xml`, ""].join("\n"),
    );
  });
  app.get("/sitemap.xml", (req, res) => {
    const base = site(req);
    const itens = Object.keys(PAGINAS).map((r) => `  <url><loc>${esc(base + r)}</loc><priority>${r === "/" ? "1.0" : "0.7"}</priority></url>`);
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${itens.join("\n")}\n</urlset>\n`);
  });
  // as páginas HTML saem com as tags de SEO; o resto cai no express.static
  for (const rota of Object.keys(PAGINAS)) {
    const caminhos = rota === "/" ? ["/", "/index.html"] : [rota];
    app.get(caminhos, (req, res, next) => {
      let html;
      try { html = lerHtml(rota); } catch { return next(); }
      const titulo = (html.match(/<title>([^<]*)<\/title>/) || [, "Vila da Galera"])[1];
      res.type("html").send(html.replace("</head>", tags(rota, site(req), titulo) + "\n</head>"));
    });
  }
}

module.exports = { ligar, PAGINAS };
