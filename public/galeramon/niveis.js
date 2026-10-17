// Nível, experiência, evolução e a chance da Pokébola, com os dados da PokéAPI (pokeapi-dados.js, gerado por
// ferramentas/base-pokeapi.js). UMD: o servidor (vila-mato.js, ginasio.js, o motor) e as páginas usam as mesmas contas.
// - Os atributos de cada nível saem dos atributos base (a conta dos jogos, com IV 31 e sem EV): no nível 50 dá
//   exatamente o que a Pokédex já tinha (MONS[id].hp, atk...).
// - A experiência de cada nível é a tabela do ritmo de crescimento do Pokémon; o indivíduo guarda só o que juntou no
//   nível em que está (xp), e sobe quando chega no que falta.
// - Quem vence um Pokémon ganha a experiência da conta da 5ª geração (a experiência base dele, o nível dele e o meu).
// - Evolui no nível da PokéAPI; quem evolui por pedra, troca ou amizade usa o nível de reserva do arquivo de dados.
//   Com mais de um caminho (Eevee), cada indivíduo segue o seu, sorteado pelo número dele.
// - A Pokébola: a conta dos jogos, (3·máx − 2·vida) · taxa / (3·máx · 255), vezes 1,5 com o Pokémon tonto; são quatro
//   checagens de q = chance^(1/4), e a bola balança uma vez por checagem que passou (no máximo três).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./pokeapi-dados.js"), require("./pokemon.js"));
  else root.Niveis = factory(root.PokeApiDados, root.PokeDex);
})(typeof self !== "undefined" ? self : this, function (Dados, PokeDex) {
  const NIVEL_MAX = 100, NIVEL_INICIAL = 5, TONTO = 1.5;
  // o nível de quem aparece na grama, pela raridade
  const NIVEL_SELVAGEM = { comum: [3, 12], incomum: [10, 22], raro: [18, 32], epico: [28, 42], lendario: [45, 55] };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dadosDe = (id) => Dados.POKEMON[id] || { cresc: "medio", xp: 60, taxa: 45 };
  const tabela = (id) => Dados.CRESCIMENTO[dadosDe(id).cresc] || Dados.CRESCIMENTO.medio;
  // a experiência que falta do começo deste nível até o próximo
  const faltaParaSubir = (id, nivel) => (nivel >= NIVEL_MAX ? Infinity : tabela(id)[nivel] - tabela(id)[nivel - 1]);

  // os atributos no nível (os de MONS são os do nível 50)
  function atributos(id, nivel) {
    const m = PokeDex.MONS[id];
    if (!m || !m.base) return null;
    const L = clamp(Math.round(nivel), 1, NIVEL_MAX), [hp, atk, def, sat, sdf, spd] = m.base, c = (b) => Math.floor(((2 * b + 31) * L) / 100);
    return { hp: c(hp) + L + 10, atk: c(atk) + 5, def: c(def) + 5, sat: c(sat) + 5, sdf: c(sdf) + 5, spd: c(spd) + 5 };
  }
  // a experiência de vencer o Pokémon "alvo" (nível nivelAlvo) com um Pokémon de nível nivelMeu (selvagem: ×1)
  function xpDaVitoria(alvo, nivelAlvo, nivelMeu) {
    const b = dadosDe(alvo).xp, L = nivelAlvo, Lp = nivelMeu;
    return Math.floor(((b * L) / 5) * Math.pow((2 * L + 10) / (L + Lp + 10), 2.5)) + 1;
  }
  // o caminho de evolução deste indivíduo (semente: o número dele no banco)
  function evolucaoDe(id, semente = 0) {
    const ops = dadosDe(id).evolui;
    if (!ops || !ops.length) return null;
    return ops[Math.abs(Math.floor(semente)) % ops.length];
  }
  // soma a experiência: devolve o indivíduo novo, quantos níveis subiu e as evoluções no caminho
  function ganharXp(ind, ganho) {
    let { bicho, nivel, xp } = ind;
    const antes = { bicho, nivel }, evolucoes = [];
    xp = Math.max(0, (xp || 0) + Math.max(0, Math.floor(ganho)));
    while (nivel < NIVEL_MAX && xp >= faltaParaSubir(bicho, nivel)) { xp -= faltaParaSubir(bicho, nivel); nivel++; }
    if (nivel >= NIVEL_MAX) xp = 0;
    for (let i = 0; i < 3; i++) { // pode passar de duas fases de uma vez (Charmander do 15 ao 36)
      const ev = evolucaoDe(bicho, ind.id);
      if (!ev || nivel < ev.nivel || !PokeDex.MONS[ev.para]) break;
      evolucoes.push({ de: bicho, para: ev.para, como: ev.como });
      bicho = ev.para;
    }
    return { bicho, nivel, xp, subiu: nivel - antes.nivel, evolucoes, antes };
  }
  // a chance de a Pokébola pegar (0 a 1)
  function chanceDeCaptura({ bicho, hp, max, tonto = false }) {
    const M = Math.max(1, max), H = clamp(hp == null ? M : hp, 1, M);
    return clamp(((3 * M - 2 * H) * dadosDe(bicho).taxa * (tonto ? TONTO : 1)) / (3 * M * 255), 0, 1);
  }
  // joga a Pokébola: pegou ou não, e quantas vezes ela balança antes (0 a 3)
  function jogarPokebola(chance, sorte = Math.random) {
    const q = Math.pow(clamp(chance, 0, 1), 1 / 4);
    let passou = 0;
    while (passou < 4 && sorte() < q) passou++;
    return { pegou: passou === 4, balancos: Math.min(3, passou) };
  }
  // quanto dura a cena da Pokébola (captura2d.js toca nesse tempo; o Ginásio pausa a luta o mesmo tanto): carga, voo,
  // a bola abrindo e puxando o Pokémon, cada balanço e o fim (o clique e as estrelas, ou a bola estourando)
  const TEMPOS_DA_BOLA = { carga: 550, voo: 650, abre: 600, balanco: 700, pegou: 1300, escapou: 900 };
  function duracaoDaCaptura(balancos, pegou) {
    const T = TEMPOS_DA_BOLA;
    return T.carga + T.voo + T.abre + balancos * T.balanco + (pegou ? T.pegou : T.escapou);
  }
  function nivelSelvagem(raridade, sorte = Math.random) {
    const [a, b] = NIVEL_SELVAGEM[raridade] || NIVEL_SELVAGEM.comum;
    return a + Math.floor(sorte() * (b - a + 1));
  }
  // a chance em texto: 0,4%, 12%, 100%
  const porcento = (c) => (c >= 0.995 ? "100%" : c < 0.1 ? `${(c * 100).toFixed(1).replace(".", ",")}%` : `${Math.round(c * 100)}%`);
  return { NIVEL_MAX, NIVEL_INICIAL, TONTO, NIVEL_SELVAGEM, dadosDe, faltaParaSubir, atributos, xpDaVitoria, evolucaoDe, ganharXp, chanceDeCaptura, jogarPokebola, nivelSelvagem, porcento, TEMPOS_DA_BOLA, duracaoDaCaptura };
});
