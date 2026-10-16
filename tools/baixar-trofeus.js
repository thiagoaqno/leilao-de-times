// Atualiza os PNGs das taças da Carreira e o catálogo de fontes, uma vez no desenvolvimento.
// Em jogo, a Estante lê apenas os arquivos locais.
const fs = require('node:fs');
const path = require('node:path');
const { LIGAS, buscarTrofeu } = require('../trofeus-carreira');

const raiz = path.join(__dirname, '..', 'public', 'carreira');
const pasta = path.join(raiz, 'trofeus-locais');
const catalogo = path.join(raiz, 'trofeus-api.json');
const script = path.join(raiz, 'trofeus-api.js');
const assinatura = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const valido = (dados) => dados.length > 100 && dados.length < 5_000_000 && dados.subarray(0, 8).equals(assinatura);
const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function executar() {
  fs.mkdirSync(pasta, { recursive: true });
  const fontes = fs.existsSync(catalogo) ? JSON.parse(fs.readFileSync(catalogo, 'utf8')) : {};
  for (const [id, liga] of Object.entries(LIGAS)) {
    const destino = path.join(pasta, `${id}.png`);
    if (!process.argv.includes('--refresh') && fs.existsSync(destino) && valido(fs.readFileSync(destino))) {
      console.log(`${id}: já salvo`);
      continue;
    }
    try {
      const url = await buscarTrofeu(id);
      if (!url) { console.log(`${id}: sem taça na API`); continue; }
      const resposta = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const dados = resposta.ok ? Buffer.from(await resposta.arrayBuffer()) : Buffer.alloc(0);
      if (!valido(dados)) { console.log(`${id}: imagem inválida`); continue; }
      fs.writeFileSync(destino, dados);
      fontes[id] = { liga, url, pagina: `https://www.thesportsdb.com/league/${liga}` };
      console.log(`${id}: ${Math.round(dados.length / 1024)} KB`);
    } catch (erro) { console.log(`${id}: ${erro.message}`); }
    await pausa(250);
  }
  const disponiveis = Object.fromEntries(Object.entries(fontes).filter(([id]) => fs.existsSync(path.join(pasta, `${id}.png`))));
  fs.writeFileSync(catalogo, JSON.stringify(disponiveis, null, 2) + '\n');
  fs.writeFileSync(script, `window.TROFEUS_API = ${JSON.stringify(disponiveis, null, 2)};\n`);
  console.log(`${Object.keys(disponiveis).length} taças locais no catálogo`);
}

if (require.main === module) executar().catch((e) => { console.error(e); process.exitCode = 1; });
module.exports = { valido };
