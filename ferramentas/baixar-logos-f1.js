// Baixa uma vez os emblemas da Formula 1 da TheSportsDB para servir do próprio site.
// Use --refresh para atualizar. A API gratuita lista dez equipes; Williams vem pela busca individual.
const fs = require('node:fs');
const path = require('node:path');

const PASTA = path.join(__dirname, '..', 'public', 'corrida', 'logos');
const CHAVE = process.env.THESPORTSDB_KEY || '123';
const API = `https://www.thesportsdb.com/api/v1/json/${CHAVE}`;
const EQUIPES = [
  ['mclaren', 'McLaren', 'MCL', 'McLaren', '#f47600'],
  ['ferrari', 'Ferrari', 'FER', 'Ferrari', '#ff2800'],
  ['mercedes', 'Mercedes', 'MER', 'Mercedes-AMG', '#00d7b6'],
  ['red-bull', 'Red Bull', 'RBR', 'Red Bull Racing', '#4781d7'],
  ['racing-bulls', 'Racing Bulls', 'RB', 'Racing Bulls', '#6c98ff'],
  ['aston-martin', 'Aston Martin', 'AMR', 'Aston Martin', '#229971'],
  ['williams', 'Williams', 'WIL', 'Williams Racing', '#1868db'],
  ['audi', 'Audi', 'AUD', 'Audi Revolut', '#ff2d00'],
  ['alpine', 'Alpine', 'ALP', 'Alpine', '#00a1e8'],
  ['haas', 'Haas', 'HAS', 'Haas F1', '#9c9fa2'],
  ['cadillac', 'Cadillac', 'CAD', 'Cadillac', '#909090'],
];
const ler = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
};
const normalizarCor = (valor, reserva) => /^#?[0-9a-f]{6}$/i.test(valor || '') ? `#${valor.replace('#', '').toLowerCase()}` : reserva;

(async () => {
  fs.mkdirSync(PASTA, { recursive: true });
  const lista = (await (await ler(`${API}/search_all_teams.php?l=Formula_1`)).json()).teams || [];
  const indice = {};
  for (const [id, nome, sigla, busca, cor] of EQUIPES) {
    const arquivo = `${id}.png`, destino = path.join(PASTA, arquivo);
    let equipe = lista.find((t) => t.strTeam?.toLowerCase().includes(busca.toLowerCase()));
    if (!equipe) equipe = ((await (await ler(`${API}/searchteams.php?t=${encodeURIComponent(busca)}`)).json()).teams || [])
      .find((t) => t.strSport === 'Motorsport' && t.strTeam?.toLowerCase().includes(busca.toLowerCase()));
    const url = equipe?.strBadge || equipe?.strLogo;
    if ((!fs.existsSync(destino) || process.argv.includes('--refresh')) && url) {
      const origem = new URL(url);
      if (!origem.hostname.endsWith('thesportsdb.com')) throw new Error(`Host inesperado: ${url}`);
      const dados = Buffer.from(await (await ler(url)).arrayBuffer());
      if (!dados.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`PNG inválido: ${url}`);
      fs.writeFileSync(destino, dados);
    }
    indice[id] = { nome, sigla, cor: normalizarCor(equipe?.strColour1, cor), arquivo: fs.existsSync(destino) ? arquivo : null, fonte: url || null };
    console.log(`${id}: ${indice[id].arquivo ? 'ok' : 'sem emblema'}`);
  }
  fs.writeFileSync(path.join(PASTA, 'index.json'), JSON.stringify(indice, null, 2) + '\n');
  fs.writeFileSync(path.join(PASTA, 'index.js'), `// Gerado por ferramentas/baixar-logos-f1.js\nwindow.EQUIPES_F1 = ${JSON.stringify(indice)};\n`);
})().catch((erro) => { console.error(erro); process.exitCode = 1; });
