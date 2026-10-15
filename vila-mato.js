// A grama alta da Vila (em frente ao Ginásio): os encontros com Pokémon selvagens, no canal "/vila". As regras (o lugar
// da grama, as raridades, o nível de quem aparece) ficam em public/vila/mato.js e as contas de nível, experiência,
// evolução e Pokébola em public/galeramon/niveis.js (com os dados da PokéAPI); aqui o servidor sorteia e guarda no banco
// (bd.js: guardarCaptura, garantirIniciais, pokemonsDe, atualizarPokemon, pokedexDe, capturasDe, rankingCapturas).
// O treinador é um código aleatório guardado no navegador (galera:treinador); só o hash dele vai para o banco.
// Eventos (todos com resposta):
// - mato { codigo }: deu um passo na grama; pode aparecer um Pokémon (encontro) — o servidor confere a posição;
// - pokebola { codigo }: joga a Pokébola no encontro aberto, com a vida cheia (pegou, escapou ou fugiu);
// - lutar { codigo, time }: leva o encontro para uma luta no Ginásio (ginasio.criarSelvagem), onde dá para enfraquecer
//   o Pokémon antes da Pokébola, ou vencer e ganhar experiência;
// - fugir: sai do encontro;
// - pokedex { codigo }: os Pokémon do treinador (com nível, experiência e a próxima evolução) e o ranking da galera.
const crypto = require("crypto");
const Mato = require("./public/vila/mato.js");
const Niveis = require("./public/galeramon/niveis.js");
const PokeDex = require("./public/galeramon/pokemon.js");
const bd = require("./bd.js");

const PASSO_MS = +process.env.VILA_MATO_PASSO_MS || 180; // um passo na grama a cada tanto (anda-se ~6 casas por segundo)
const hashDe = (codigo) => (typeof codigo === "string" && /^[a-f0-9]{32}$/.test(codigo) ? crypto.createHash("sha256").update(codigo).digest("hex") : null);
// a sorte do servidor (os testes trocam por uma de mentira)
let sorte = Math.random;
const sortear = () => sorte();

const INICIAIS = () => Mato.INICIAIS.map((id) => [id, Mato.raridadeDe(id)]);
// os Pokémon de um treinador (pelo hash): bicho → o melhor indivíduo daquela espécie { id, nivel, xp }. Sem treinador,
// só os três iniciais no nível 5 (de mentira: não sobem).
function colecaoDe(treinador, nome = "") {
  const mapa = new Map();
  if (!treinador) { for (const id of Mato.INICIAIS) mapa.set(id, { id: 0, bicho: id, nivel: Niveis.NIVEL_INICIAL, xp: 0 }); return mapa; }
  bd.garantirIniciais(treinador, nome, INICIAIS());
  for (const p of bd.pokemonsDe(treinador)) if (!mapa.has(p.bicho)) mapa.set(p.bicho, p); // a lista já vem do nível mais alto
  return mapa;
}
// soma experiência a um Pokémon do treinador (sobe de nível e evolui no banco); devolve o que aconteceu
function darXp(treinador, ind, ganho) {
  if (!treinador || !ind || !ind.id) return null;
  const r = Niveis.ganharXp(ind, ganho);
  bd.atualizarPokemon(treinador, ind.id, r);
  for (const ev of r.evolucoes) bd.registrarNaPokedex(treinador, ev.para); // as fases do meio também entram na Pokédex
  return { id: ind.id, ganho: Math.floor(ganho), ...r };
}
// o Pokémon como a Pokédex da Vila mostra: com o que falta para subir e a próxima evolução
function fichaDe(p) {
  const ev = Niveis.evolucaoDe(p.bicho, p.id);
  return { ...p, falta: Niveis.faltaParaSubir(p.bicho, p.nivel), ...(ev && PokeDex.MONS[ev.para] && { evolui: { para: ev.para, nivel: ev.nivel, como: ev.como } }) };
}

function ligarMato(socket, { eu, noticia, OX, OY, ginasio }) {
  let encontro = null, ultimoPasso = 0;
  const responder = (cb) => (typeof cb === "function" ? cb : () => {});
  const naGrama = (p) => p && Mato.naGrama(p.x - OX, p.y - OY);
  const publico = (e) => ({ bicho: e.bicho, nome: PokeDex.MONS[e.bicho].n, raridade: e.raridade, brilhante: e.brilhante, num: PokeDex.MONS[e.bicho].num, nivel: e.nivel, hp: e.hp, max: e.max, chance: Niveis.chanceDeCaptura(e), bolas: e.bolas });

  socket.on("mato", (d = {}, cb) => {
    const r = responder(cb), p = eu();
    if (!p || !hashDe(d.codigo)) return r({ ok: false });
    if (encontro) return r({ ok: true, encontro: publico(encontro) });
    if (!naGrama(p)) return r({ ok: true });
    const agora = Date.now();
    if (agora - ultimoPasso < PASSO_MS) return r({ ok: true });
    ultimoPasso = agora;
    if (sorte() >= Mato.CHANCE_ENCONTRO) return r({ ok: true });
    encontro = { ...Mato.sortearEncontro(sortear), bolas: 0 };
    r({ ok: true, encontro: publico(encontro) });
  });

  socket.on("pokebola", (d = {}, cb) => {
    const r = responder(cb), p = eu(), treinador = hashDe(d.codigo);
    if (!p || !treinador || !encontro) return r({ ok: false, error: "Nenhum Pokémon por perto." });
    const e = encontro, jogada = Mato.jogarPokebola(e, sortear);
    e.bolas++;
    if (jogada.resultado !== "escapou") encontro = null;
    if (jogada.resultado === "pegou") {
      bd.garantirIniciais(treinador, p.name, INICIAIS());
      bd.guardarCaptura(treinador, p.name, e.bicho, e.raridade, e.brilhante, e.nivel);
      anunciar(noticia, p.name, e);
    }
    r({ ok: true, ...jogada, encontro: publico(e) });
  });

  socket.on("lutar", (d = {}, cb) => {
    const r = responder(cb), p = eu(), treinador = hashDe(d.codigo);
    if (!p || !treinador || !encontro) return r({ ok: false, error: "Nenhum Pokémon por perto." });
    if (!ginasio || !ginasio.criarSelvagem) return r({ ok: false, error: "O Ginásio não está aberto." });
    const lugar = ginasio.criarSelvagem({ nome: p.name, treinador, time: Array.isArray(d.time) ? d.time : [], encontro });
    if (!lugar) return r({ ok: false, error: "Não deu para abrir a luta." });
    encontro = null;
    r({ ok: true, ...lugar });
  });

  socket.on("fugir", (cb) => { encontro = null; responder(cb)({ ok: true }); });

  socket.on("pokedex", (d = {}, cb) => {
    const r = responder(cb), treinador = hashDe(d.codigo), p = eu();
    if (!treinador) return r({ ok: false });
    bd.garantirIniciais(treinador, p ? p.name : "", INICIAIS());
    r({ ok: true, pokemons: bd.pokemonsDe(treinador).map(fichaDe), especies: bd.pokedexDe(treinador), colecao: bd.capturasDe(treinador), ranking: bd.rankingCapturas(10), total: PokeDex.IDS.length });
  });
}
// épico, lendário e brilhante viram notícia na vila inteira
function anunciar(noticia, nome, e) {
  if (!noticia || !(e.brilhante || e.raridade === "lendario" || e.raridade === "epico")) return;
  const n = PokeDex.MONS[e.bicho].n;
  noticia(`${e.brilhante ? "✨" : "🌿"} ${nome} capturou ${e.brilhante ? "um " + n + " brilhante" : n + (e.raridade === "lendario" ? ", um lendário," : ", um épico,")} na grama alta!`);
}
ligarMato.trocarSorte = (f) => { sorte = f || Math.random; };
Object.assign(ligarMato, { hashDe, colecaoDe, darXp, fichaDe, anunciar, INICIAIS });
module.exports = ligarMato;
