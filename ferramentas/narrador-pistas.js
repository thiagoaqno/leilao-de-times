#!/usr/bin/env node
// Gera as vozes do narrador que apresenta a pista na transmissão (public/corrida/narrador/<pista>-<n>.mp3) com a ElevenLabs.
// Uso: ELEVENLABS_API_KEY=... node ferramentas/narrador-pistas.js [pista ...] [--refazer] [--estimar]   (ou rode gerar-narrador.bat)
//   pista      só as falas dessas pistas (ex.: interlagos monza); sem nenhuma, todas
//   --refazer  gera de novo as que já existem (por padrão elas são puladas)
//   --estimar  só conta os arquivos e os caracteres que seriam gastos no plano; não precisa de chave e não chama a API
// ELEVENLABS_VOICE_ID é opcional. A chave só é lida do ambiente: nunca é gravada nem impressa. Node 18+.
const fs = require("fs");
const path = require("path");
const { FALAS, PISTAS } = require("../public/corrida/narrador/falas.js");

const PASTA = path.join(__dirname, "..", "public", "corrida", "narrador");
const VOZ = (process.env.ELEVENLABS_VOICE_ID || "").trim() || "nPczCjzI2devNBz1zQrb"; // Brian: grave, encorpada, boa de narração
const args = process.argv.slice(2), refazer = args.includes("--refazer"), estimar = args.includes("--estimar");
const pedidas = args.filter((a) => !a.startsWith("--")).map((a) => a.toLowerCase());

const existe = (f) => fs.existsSync(path.join(PASTA, `${f.id}.mp3`));
const milhar = (n) => n.toLocaleString("pt-BR");

async function gerar(chave, f) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(VOZ)}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": chave, "Content-Type": "application/json", Accept: "audio/mpeg" },
    // menos estável e com estilo: o narrador de TV é animado, não lê como o engenheiro
    body: JSON.stringify({ text: f.texto, model_id: "eleven_multilingual_v2", language_code: "pt", voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.35, speed: 1.05, use_speaker_boost: true } }),
  });
  if (!r.ok) {
    const erro = new Error(r.status === 401 ? "chave da ElevenLabs recusada (401): confira se copiou a chave certa" : r.status === 429 ? "limite da ElevenLabs atingido (429): espere um pouco ou veja o seu plano e rode de novo (as já feitas são puladas)" : `a ElevenLabs respondeu ${r.status}`);
    erro.status = r.status; throw erro;
  }
  fs.writeFileSync(path.join(PASTA, `${f.id}.mp3`), Buffer.from(await r.arrayBuffer()));
}

async function main() {
  const desconhecidas = pedidas.filter((p) => !PISTAS[p]);
  if (desconhecidas.length) { console.error(`Pista sem fala: ${desconhecidas.join(", ")}\nPistas com fala: ${Object.keys(PISTAS).join(", ")}`); process.exit(1); }
  const alvo = pedidas.length ? FALAS.filter((f) => pedidas.includes(f.pista)) : FALAS;
  const fazer = alvo.filter((f) => refazer || !existe(f));
  const chars = (l) => l.reduce((a, f) => a + f.texto.length, 0);
  const total = FALAS.filter(existe).length;
  console.log(`Falas selecionadas: ${alvo.length} (${Object.keys(PISTAS).length} pistas no total, ${FALAS.length} falas) · a gerar: ${fazer.length} · ${milhar(chars(fazer))} caracteres no plano da ElevenLabs`);
  if (estimar) { console.log(`Arquivos de voz que já existem: ${total} de ${FALAS.length} · se gerasse tudo de novo: ${milhar(chars(FALAS))} caracteres`); return; }

  const chave = (process.env.ELEVENLABS_API_KEY || "").trim();
  if (!chave) { console.error("Falta a chave: defina ELEVENLABS_API_KEY (ou use o gerar-narrador.bat)."); process.exit(1); }
  fs.mkdirSync(PASTA, { recursive: true });
  let feitas = 0, puladas = 0, falhas = 0;
  for (const [i, f] of alvo.entries()) {
    const n = `[${i + 1}/${alvo.length}] ${f.id}`;
    if (!refazer && existe(f)) { puladas++; console.log(`${n}: já existe, pulei`); continue; }
    try { await gerar(chave, f); feitas++; console.log(`${n}: ok`); }
    catch (e) {
      falhas++; console.error(`${n}: ${e.message}`);
      if (e.status === 401 || e.status === 429) break; // não adianta insistir
    }
  }
  console.log(`\nGeradas: ${feitas} · puladas: ${puladas} · com erro: ${falhas} · arquivos de voz existentes: ${FALAS.filter(existe).length} de ${FALAS.length}`);
  process.exit(falhas ? 1 : 0);
}
main();
