// A grama alta da Vila (em frente ao Ginásio): os encontros com Pokémon selvagens e a Pokébola infinita, no canal
// "/vila". As regras (o lugar da grama, as raridades, as chances) ficam em public/vila/mato.js; aqui o servidor sorteia
// e guarda as capturas no banco (bd.js: guardarCaptura, capturasDe, rankingCapturas).
// O treinador é um código aleatório guardado no navegador (galera:treinador); só o hash dele vai para o banco.
// Eventos (todos com resposta):
// - mato { codigo }: deu um passo na grama; pode aparecer um Pokémon (encontro) — o servidor confere a posição;
// - pokebola { codigo }: joga a Pokébola no encontro aberto (pegou, escapou ou fugiu);
// - fugir: sai do encontro;
// - pokedex { codigo }: a coleção do treinador e o ranking da galera.
const crypto = require("crypto");
const Mato = require("./public/vila/mato.js");
const PokeDex = require("./public/galeramon/pokemon.js");
const bd = require("./bd.js");

const PASSO_MS = +process.env.VILA_MATO_PASSO_MS || 180; // um passo na grama a cada tanto (anda-se ~6 casas por segundo)
const hashDe = (codigo) => (typeof codigo === "string" && /^[a-f0-9]{32}$/.test(codigo) ? crypto.createHash("sha256").update(codigo).digest("hex") : null);
// a sorte do servidor (os testes trocam por uma de mentira)
let sorte = Math.random;

function ligarMato(socket, { eu, noticia, OX, OY }) {
  let encontro = null, ultimoPasso = 0;
  const responder = (cb) => (typeof cb === "function" ? cb : () => {});
  const naGrama = (p) => p && Mato.naGrama(p.x - OX, p.y - OY);
  const publico = (e) => ({ bicho: e.bicho, nome: PokeDex.MONS[e.bicho].n, raridade: e.raridade, brilhante: e.brilhante, num: PokeDex.MONS[e.bicho].num, bolas: e.bolas });

  socket.on("mato", (d = {}, cb) => {
    const r = responder(cb), p = eu();
    if (!p || !hashDe(d.codigo)) return r({ ok: false });
    if (encontro) return r({ ok: true, encontro: publico(encontro) });
    if (!naGrama(p)) return r({ ok: true });
    const agora = Date.now();
    if (agora - ultimoPasso < PASSO_MS) return r({ ok: true });
    ultimoPasso = agora;
    if (sorte() >= Mato.CHANCE_ENCONTRO) return r({ ok: true });
    encontro = { ...Mato.sortearEncontro(sorte), bolas: 0 };
    r({ ok: true, encontro: publico(encontro) });
  });

  socket.on("pokebola", (d = {}, cb) => {
    const r = responder(cb), p = eu(), treinador = hashDe(d.codigo);
    if (!p || !treinador || !encontro) return r({ ok: false, error: "Nenhum Pokémon por perto." });
    const e = encontro, jogada = Mato.jogarPokebola(e.raridade, sorte);
    e.bolas++;
    if (jogada.resultado !== "escapou") encontro = null;
    if (jogada.resultado === "pegou") {
      bd.guardarCaptura(treinador, p.name, e.bicho, e.raridade, e.brilhante);
      const nome = PokeDex.MONS[e.bicho].n;
      if (e.brilhante || e.raridade === "lendario" || e.raridade === "epico")
        noticia(`${e.brilhante ? "✨" : "🌿"} ${p.name} capturou ${e.brilhante ? "um " + nome + " brilhante" : nome + (e.raridade === "lendario" ? ", um lendário," : ", um épico,")} na grama alta!`);
    }
    r({ ok: true, ...jogada, encontro: publico(e), ...(jogada.resultado === "pegou" && { colecao: bd.capturasDe(treinador) }) });
  });

  socket.on("fugir", (cb) => { encontro = null; responder(cb)({ ok: true }); });

  socket.on("pokedex", (d = {}, cb) => {
    const r = responder(cb), treinador = hashDe(d.codigo);
    if (!treinador) return r({ ok: false });
    r({ ok: true, colecao: bd.capturasDe(treinador), ranking: bd.rankingCapturas(10), total: PokeDex.IDS.length });
  });
}
ligarMato.trocarSorte = (f) => { sorte = f || Math.random; };
module.exports = ligarMato;
