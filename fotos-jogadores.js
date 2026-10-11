// Fotos recortadas da Carreira pela TheSportsDB. Busca só jogadores vistos na tela,
// confere o nome antes de usar a imagem e mantém o resultado no banco entre reinícios.
const fs = require("fs");
const path = require("path");
const bd = require("./bd.js");

const jogadores = new Map();
const pasta = path.join(__dirname, "public", "carreira", "base");
for (const arquivo of fs.readdirSync(pasta).filter((f) => /-2026\.js$/.test(f) && f !== "mundo-2026.js")) {
  const base = require(path.join(pasta, arquivo));
  for (const clube of base.clubes) for (const jogador of clube.jogadores) {
    jogadores.set(jogador.id, { nome: jogador.nome, clube: clube.nome });
  }
}

const normalizar = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const urlSegura = (s) => typeof s === "string" && /^https:\/\/r2\.thesportsdb\.com\/images\/media\/player\/cutout\/[a-z0-9]+\.png$/i.test(s);

function escolher(jogador, lista) {
  const nome = normalizar(jogador.nome);
  for (const p of lista || []) {
    if (p.strSport !== "Soccer" || !urlSegura(p.strCutout)) continue;
    const nomes = [p.strPlayer, ...String(p.strPlayerAlternate || "").split(",")].map(normalizar);
    if (!nomes.includes(nome)) continue;
    // Nomes curtos, como "Pedro", precisam bater também com o clube para evitar homônimos.
    if (!nome.includes(" ") && normalizar(p.strTeam) !== normalizar(jogador.clube)) continue;
    return p.strCutout;
  }
  return null;
}

const memoria = new Map(), pendentes = new Map();
const UM_DIA = 86400e3;
let fila = Promise.resolve(), proximaBusca = 0;
function consultar(jogador) {
  const vez = fila.then(async () => {
    const espera = Math.max(0, proximaBusca - Date.now());
    if (espera) await new Promise((ok) => setTimeout(ok, espera));
    proximaBusca = Date.now() + 2100; // chave gratuita: até 30 pedidos por minuto
    const chave = process.env.THESPORTSDB_KEY || "123";
    const url = `https://www.thesportsdb.com/api/v1/json/${chave}/searchplayers.php?p=${encodeURIComponent(jogador.nome)}`;
    const resposta = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!resposta.ok) throw new Error(`TheSportsDB: ${resposta.status}`);
    return escolher(jogador, (await resposta.json()).player);
  });
  fila = vez.catch(() => {});
  return vez;
}

async function foto(id) {
  const jogador = jogadores.get(id);
  if (!jogador) return { conhecida: false, url: null };
  const agora = Date.now(), emMemoria = memoria.get(id);
  if (emMemoria && agora - emMemoria.consultado_em < (emMemoria.url ? 30 : 7) * UM_DIA) return { conhecida: true, url: emMemoria.url };
  try {
    const salvo = bd.fotoJogador(id);
    if (salvo && agora - salvo.consultado_em < (salvo.url ? 30 : 7) * UM_DIA) {
      memoria.set(id, salvo); return { conhecida: true, url: salvo.url };
    }
  } catch {} // o resto do site também funciona sem o banco
  if (!pendentes.has(id)) {
    pendentes.set(id, consultar(jogador).then((url) => {
      memoria.set(id, { url, consultado_em: Date.now() });
      try { bd.guardarFotoJogador(id, url); } catch {}
      return { conhecida: true, url };
    }).finally(() => pendentes.delete(id)));
  }
  return pendentes.get(id);
}

function attach(app) {
  app.get("/api/foto-jogador/:id", async (req, res) => {
    try {
      const r = await foto(req.params.id);
      if (!r.conhecida) return res.status(404).json({ url: null });
      res.set("Cache-Control", "public, max-age=3600").json({ url: r.url });
    } catch { res.status(503).json({ url: null }); }
  });
}

module.exports = { attach, escolher, foto };
