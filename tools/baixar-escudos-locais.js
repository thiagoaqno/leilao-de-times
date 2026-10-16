// Guarda no repositório os escudos já encontrados na TheSportsDB e procura os clubes da Série B.
// Depois disso, o jogo serve apenas os PNG locais. Rode de novo para atualizar os arquivos.
const fs = require("node:fs");
const path = require("node:path");
const raiz = path.join(__dirname, "..", "public", "carreira");
const pasta = path.join(raiz, "escudos-locais");
const arquivo = path.join(raiz, "escudos-api.json");
const busca = require(path.join(raiz, "escudos-busca.js"));
const fontes = JSON.parse(fs.readFileSync(arquivo, "utf8"));
// A busca antiga pelo nome pegou equipes femininas ou de base destes clubes.
// Estes endereços foram conferidos na própria busca da TheSportsDB pelo nome masculino.
const correcoes = {
  "afc-bournemouth": { url: "https://r2.thesportsdb.com/images/media/team/badge/y08nak1534071116.png", nome: "Bournemouth" },
  alaves: { url: "https://r2.thesportsdb.com/images/media/team/badge/mfn99h1734673842.png", nome: "Deportivo Alavés" },
  brighton: { url: "https://r2.thesportsdb.com/images/media/team/badge/ywypts1448810904.png", nome: "Brighton and Hove Albion" },
  milan: { url: "https://r2.thesportsdb.com/images/media/team/badge/wvspur1448806617.png", nome: "AC Milan" },
  "olympique-de-marseille": { url: "https://r2.thesportsdb.com/images/media/team/badge/c6bazh1779212287.png", nome: "Marseille" },
  tottenham: { url: "https://r2.thesportsdb.com/images/media/team/badge/dfyfhl1604094109.png", nome: "Tottenham Hotspur" },
};
const refazer = new Set(Object.entries(correcoes).filter(([id, fonte]) => fontes[id]?.url !== fonte.url).map(([id]) => id));
if (process.argv.includes("--refresh")) Object.keys(fontes).forEach((id) => refazer.add(id));
Object.assign(fontes, correcoes);
delete fontes["deportivo-la-coruna"]; // a API só trouxe o Fabril ou o feminino; o SVG correto fica no lugar
const chave = process.env.THESPORTSDB_KEY || "123";
const assinaturaPng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const normalizar = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const seguro = (url) => /^https:\/\/r2\.thesportsdb\.com\/images\/media\/team\/badge\/[a-z0-9]+\.png$/i.test(url);
const destino = (id) => path.join(pasta, `${id}.png`);
const valido = (dados) => dados.length > 100 && dados.subarray(0, 8).equals(assinaturaPng);

async function procurar(id) {
  for (const nome of busca[id]) {
    try {
      const url = `https://www.thesportsdb.com/api/v1/json/${chave}/searchteams.php?t=${encodeURIComponent(nome)}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (!r.ok) continue;
      const times = (await r.json()).teams || [];
      const time = times.find((t) => t.strSport === "Soccer" && t.strCountry === "Brazil" && seguro(t.strBadge) &&
        [t.strTeam, ...String(t.strTeamAlternate || "").split(",")].some((n) => normalizar(n) === normalizar(nome)));
      if (time) return { url: time.strBadge, nome: time.strTeam };
    } catch { /* a próxima variação do nome ainda pode funcionar */ }
  }
  return null;
}
async function baixar(id, fonte) {
  if (!/^[a-z0-9-]+$/.test(id) || !seguro(fonte.url)) return false;
  if (!refazer.has(id) && fs.existsSync(destino(id)) && valido(fs.readFileSync(destino(id)))) return true;
  for (const url of [`${fonte.url}/small`, fonte.url]) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!r.ok) continue;
      const dados = Buffer.from(await r.arrayBuffer());
      if (!valido(dados) || dados.length > 2_000_000) continue;
      fs.writeFileSync(destino(id), dados);
      return true;
    } catch { /* tenta o original se a versão pequena não estiver disponível */ }
  }
  return false;
}
async function executar() {
  fs.mkdirSync(pasta, { recursive: true });
  if (fs.existsSync(destino("deportivo-la-coruna"))) fs.unlinkSync(destino("deportivo-la-coruna"));
  const pendentes = Object.keys(busca).filter((id) => !fontes[id]);
  // A busca usa a chave gratuita (30 pedidos/minuto). Consultamos poucos clubes por execução.
  for (let i = 0; i < pendentes.length; i += 4) {
    await Promise.all(pendentes.slice(i, i + 4).map(async (id) => {
      const achado = await procurar(id);
      if (achado) fontes[id] = achado;
      console.log(`${id}: ${achado ? achado.nome : "sem escudo confiável"}`);
    }));
  }
  const entradas = Object.entries(fontes), salvos = {}, falhas = [];
  let proximo = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (proximo < entradas.length) {
      const [id, fonte] = entradas[proximo++];
      if (await baixar(id, fonte)) salvos[id] = fonte;
      else { falhas.push(id); console.warn(`Falhou: ${id}`); }
    }
  }));
  const ordenados = Object.fromEntries(Object.entries(salvos).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(arquivo, JSON.stringify(ordenados, null, 1) + "\n");
  fs.writeFileSync(arquivo.replace(/\.json$/, ".js"), `// gerado por tools/baixar-escudos-locais.js; os arquivos ficam em escudos-locais/\nwindow.ESCUDOS_API = ${JSON.stringify(ordenados)};\n`);
  console.log(`Escudos locais: ${Object.keys(ordenados).length}. Sem arquivo: ${falhas.join(", ") || "nenhum"}.`);
  if (falhas.length) process.exitCode = 1;
}
if (require.main === module) executar().catch((e) => { console.error(e); process.exitCode = 1; });
module.exports = { seguro, valido };
