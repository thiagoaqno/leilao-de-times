#!/usr/bin/env node
// Gera os sons da pista (public/corrida/sons/<id>.mp3) com os efeitos sonoros da ElevenLabs: o pneu na zebra e a torcida das
// arquibancadas. O jogo (sons.js) toca estes arquivos quando existem e cai no som sintetizado quando faltam.
// Uso: ELEVENLABS_API_KEY=... node ferramentas/sons-pista.js [--refazer] [--so zebra,torcida]   (ou rode GERAR-SONS-PISTA.bat)
// A chave só é lida do ambiente: nunca é gravada nem impressa. Node 18+.
const fs = require("fs");
const path = require("path");

const PASTA = path.join(__dirname, "..", "public", "corrida", "sons");
// `texto`: a descrição em inglês (a ElevenLabs entende melhor); `seg`: a duração; `laco`: um som que repete sem emenda
const SONS = [
  { id: "zebra", seg: 3, laco: true,
    texto: "Formula 1 car tyres riding over red and white rumble strip kerbs at high speed, deep low-frequency rumble and body vibration, rapid thudding brrrrm, onboard perspective, no engine, no music, no voices" },
  { id: "torcida", seg: 10, laco: true,
    texto: "Big crowd in a motor racing circuit grandstand, constant excited murmur and cheering, open air, wide stereo, no engines, no music, no clear words" },
  { id: "torcida-uau", seg: 3, laco: false,
    texto: "Motor racing grandstand crowd roaring and cheering as a racing car flashes past, rising woooah then fading, open air, no engine, no music" },
  { id: "buzina", seg: 2, laco: false,
    texto: "Racing fans blowing two short air horn blasts in a grandstand, outdoor, distant crowd behind, no music" },
];

const argv = process.argv.slice(2), refazer = argv.includes("--refazer"), iso = argv.indexOf("--so");
const so = iso >= 0 ? String(argv[iso + 1] || "").split(",").map((s) => s.trim()).filter(Boolean) : null;

async function pedir(chave, s, comLaco) {
  const corpo = { text: s.texto, duration_seconds: s.seg, prompt_influence: 0.55 };
  if (comLaco) corpo.loop = true;
  return fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", {
    method: "POST", headers: { "xi-api-key": chave, "Content-Type": "application/json", Accept: "audio/mpeg" }, body: JSON.stringify(corpo),
  });
}
async function gerar(chave, s) {
  let r = await pedir(chave, s, s.laco);
  if (!r.ok && s.laco && (r.status === 400 || r.status === 422)) r = await pedir(chave, s, false); // (conta sem o laço: gera normal)
  if (!r.ok) {
    const erro = new Error(r.status === 401 ? "chave da ElevenLabs recusada (401): confira se copiou a chave certa" : r.status === 429 ? "limite da ElevenLabs atingido (429): espere um pouco ou veja o seu plano" : `a ElevenLabs respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`);
    erro.status = r.status; throw erro;
  }
  fs.writeFileSync(path.join(PASTA, `${s.id}.mp3`), Buffer.from(await r.arrayBuffer()));
}

async function main() {
  const chave = (process.env.ELEVENLABS_API_KEY || "").trim();
  if (!chave) { console.error("Falta a chave: defina ELEVENLABS_API_KEY (ou use o GERAR-SONS-PISTA.bat)."); process.exit(1); }
  fs.mkdirSync(PASTA, { recursive: true });
  let feitos = 0, pulados = 0, falhas = 0;
  for (const s of SONS) {
    if (so && !so.includes(s.id)) continue;
    const arq = path.join(PASTA, `${s.id}.mp3`);
    if (!refazer && !so && fs.existsSync(arq)) { pulados++; console.log(`${s.id}: já existe, pulei`); continue; }
    try { await gerar(chave, s); feitos++; console.log(`${s.id}: ok (${s.seg} s${s.laco ? ", em laço" : ""})`); }
    catch (e) { falhas++; console.error(`${s.id}: ${e.message}`); if (e.status === 401 || e.status === 429) break; }
  }
  console.log(`\nGerados: ${feitos} · pulados: ${pulados} · com erro: ${falhas} · pasta: public\\corrida\\sons`);
  process.exit(falhas ? 1 : 0);
}
main();
