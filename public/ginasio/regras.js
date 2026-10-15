// Ginásio da Galera — motor da batalha em tempo real.
// Roda igual no servidor e no navegador: o servidor decide dano, acertos, desmaios e fim da partida.
// A física: cada golpe empurra (pelo poder e pelo peso de quem apanha), o empurrão forte atordoa um instante e quem
// bate na parede ou na pilastra com força leva um pouco mais. Para se defender há a esquiva (rolar; a esquiva no
// último instante é "perfeita": adianta as recargas e deixa o próximo golpe mais forte) e a guarda (segurar: segura
// o golpe de frente, mas gasta a barra; levantar a guarda bem na hora "apara": devolve o projétil e desequilibra quem
// bateu). Agarrão passa pela guarda; golpe passa pelo agarrão (quem apanha durante o preparo perde o golpe).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../galeramon/dados.js"), require("../galeramon/pokemon.js"), require("../galeramon/naruto.js"), require("../galeramon/lideres.js"), require("../galeramon/niveis.js"));
  else root.Ginasio = factory(root.Galeramon, root.PokeDex, root.NarutoDex, root.Lideres, root.Niveis);
})(typeof self !== "undefined" ? self : this, function (Galeramon, PokeDex, NarutoDex, Lideres, Niveis) {
  const DEX = { galeramon: Galeramon, pokemon: PokeDex, naruto: NarutoDex };
  const ARENA = {
    w: 18, h: 12,
    pilares: [
      { x: -3.2, y: -2.1, r: 0.62 }, { x: 3.2, y: -2.1, r: 0.62 },
      { x: -3.2, y: 2.1, r: 0.62 }, { x: 3.2, y: 2.1, r: 0.62 },
    ],
  };
  const RAIO_BICHO = 0.34;
  // o robô em cada dificuldade: quanto demora para reagir ao perigo (s), a chance de esquivar e de levantar a guarda
  // quando reage, o erro da mira (radianos), a pausa depois de bater (s), quanto mira à frente de quem anda e a chance
  // de punir quem ficou vulnerável na hora
  const DIFICULDADES = ["facil", "normal", "dificil"];
  const PERFIL_ROBO = [
    { reacao: [0.45, 0.75], foge: 0.3, guarda: 0.12, erro: 0.38, pausa: [0.9, 1.6], lead: 0.3, pune: 0.25 },
    { reacao: [0.32, 0.6], foge: 0.35, guarda: 0.18, erro: 0.23, pausa: [0.6, 1.15], lead: 0.6, pune: 0.5 },
    { reacao: [0.18, 0.3], foge: 0.72, guarda: 0.3, erro: 0.04, pausa: [0.08, 0.25], lead: 1, pune: 1 },
  ];
  const VEL_MIN = 2.2, VEL_MAX = 5.2; // casas por segundo (velocidade)
  const RE = 0.6; // andando de ré, a fração da velocidade
  // o bote dos golpes de perto: com o alvo na frente, a até BOTE_MAX casas além do alcance, o bicho avança antes de
  // bater (BOTE_VEL casas por segundo); durante o bote e o combo, golpe não empurra nem atordoa (só tira vida)
  const BOTE_MAX = 2.2, BOTE_VEL = 12, BOTE_ARCO = 0.85, BOTE_RECUPERA = 0.25, PERTO = ["corpo", "combo", "arremesso"];

  // ---------- o terreno de cada lugar (modo Pokémon, biomas.js desenha) ----------
  // Cada zona é uma elipse { tipo, x, y, rx, ry }, em pares espelhados pelo meio (os dois lados ganham o mesmo).
  // - agua: quem anda fica lento; o tipo Água nada, mais rápido e batendo mais forte;
  // - funda: a água funda, só passa quem nada (Água) ou voa; para os outros é parede, como a pedra;
  // - lava: queima quem anda (QUEIMA da vida por segundo) e pesa um pouco; o tipo Fogo fica à vontade;
  // - gelo: escorrega (o empurrão demora a parar); o tipo Gelo desliza rápido;
  // - areia: fofa, quem anda fica lento; Terrestre e Pedra ficam à vontade;
  // - mato: o mato alto pesa um pouco; o tipo Grama corre nele.
  // Quem voa (tipo Voador, de asa) passa por cima de tudo: das pedras, da água, da lava, sem bônus e sem castigo.
  const BIOMAS = ["floresta", "vulcao", "lagoa", "neve", "ruinas"];
  const espelho = (z) => [z, { ...z, x: -z.x, y: -z.y }];
  const TERRENOS = {
    floresta: [{ tipo: "agua", x: 0, y: 0, rx: 1.3, ry: 0.95 }, ...espelho({ tipo: "mato", x: -5.6, y: -4.1, rx: 2.2, ry: 1.15 }), ...espelho({ tipo: "mato", x: 1.2, y: -4.6, rx: 1.5, ry: 0.9 })],
    lagoa: [{ tipo: "funda", x: 0, y: 0, rx: 2.1, ry: 1.45 }, { tipo: "agua", x: 0, y: 0, rx: 3.3, ry: 2.35 }, ...espelho({ tipo: "agua", x: -6.4, y: 4.3, rx: 1.6, ry: 0.85 })],
    vulcao: [{ tipo: "lava", x: 0, y: 0, rx: 1.5, ry: 1.05 }, ...espelho({ tipo: "lava", x: -6.2, y: 4.3, rx: 1.5, ry: 0.75 }), ...espelho({ tipo: "areia", x: 2.4, y: 4.4, rx: 1.4, ry: 0.8 })],
    neve: [{ tipo: "gelo", x: 0, y: 0, rx: 3, ry: 2 }, ...espelho({ tipo: "gelo", x: -6.4, y: -4.2, rx: 1.7, ry: 0.95 })],
    ruinas: [{ tipo: "areia", x: 0, y: 0, rx: 2.4, ry: 1.6 }, ...espelho({ tipo: "areia", x: -6.4, y: 4.2, rx: 1.6, ry: 0.85 }), ...espelho({ tipo: "mato", x: 2.6, y: -4.5, rx: 1.5, ry: 0.8 })],
  };
  // o tipo que fica à vontade em cada terreno, quanto a velocidade muda para os outros e para ele
  const TERRENO = {
    agua: { casa: ["Água"], lento: 0.62 }, funda: { casa: ["Água"], lento: 0.62 }, lava: { casa: ["Fogo"], lento: 0.85 },
    gelo: { casa: ["Gelo"], lento: 0.9 }, areia: { casa: ["Terrestre", "Pedra"], lento: 0.7 }, mato: { casa: ["Grama"], lento: 0.85 },
  };
  const VEL_CASA = 1.22, DANO_CASA = 1.15, QUEIMA = 0.045, ATRITO_GELO = 0.3;
  const terrenoDe = (bioma) => TERRENOS[bioma] || [];
  // o lugar da partida: o escolhido na sala; senão, o do tipo do líder; senão, sorteado (a floresta sai mais)
  const BIOMA_DO_TIPO = { "Fogo": "vulcao", "Dragão": "vulcao", "Água": "lagoa", "Gelo": "neve", "Pedra": "ruinas", "Lutador": "ruinas", "Psíquico": "ruinas", "Fantasma": "ruinas", "Grama": "floresta", "Elétrico": "floresta" };
  const ORDEM_BIOMAS = ["floresta", "floresta", "lagoa", "vulcao", "neve", "ruinas"];
  function escolherBioma(config = {}) {
    if (BIOMAS.includes(config.arena)) return config.arena;
    const lider = Lideres && Lideres.de(config.lider);
    if (lider && BIOMA_DO_TIPO[lider.tipo]) return BIOMA_DO_TIPO[lider.tipo];
    return ORDEM_BIOMAS[Math.floor(sorteDe(`${config.seed || "ginasio"}:lugar`)() * ORDEM_BIOMAS.length)];
  }
  const dentro = (z, x, y, folga = 0) => ((x - z.x) / (z.rx + folga)) ** 2 + ((y - z.y) / (z.ry + folga)) ** 2 < 1;
  // a zona em que o ponto está (a funda ganha da rasa em volta)
  function zonaEm(terreno, x, y) {
    let achou = null;
    for (const z of terreno || []) if (dentro(z, x, y)) { if (z.tipo === "funda") return z; achou = achou || z; }
    return achou;
  }
  // como o terreno trata o bicho agora: { voa, nada, zona, casa (o tipo dele é o do terreno), vel, dano }
  function noTerreno(p, e) {
    const tipos = (spec(p, e.bicho) || {}).types || [];
    const voa = tipos.includes("Voador");
    const zona = !voa && p.terreno && p.terreno.length ? zonaEm(p.terreno, e.x, e.y) : null;
    const regra = zona && TERRENO[zona.tipo], casa = !!regra && regra.casa.some((t) => tipos.includes(t));
    return { voa, nada: tipos.includes("Água"), zona, casa, vel: !regra ? 1 : casa ? VEL_CASA : regra.lento, dano: casa ? DANO_CASA : 1 };
  }
  // a lava queima quem anda nela (só no servidor)
  function queimarNaLava(p, e, dt) {
    if (!emCampo(e) || e.oculto || e.salto || !p.terreno || !p.terreno.length) return;
    const t = noTerreno(p, e);
    if (!t.zona || t.zona.tipo !== "lava" || t.casa) { e.queima = 0; return; }
    e.queima = (e.queima || 0) + e.bicho.max * QUEIMA * dt;
    // em pedaços de 1,5% (uns três por segundo), para não mandar um evento por quadro
    if (e.queima >= Math.max(1, e.bicho.max * 0.015)) { const n = Math.floor(e.queima); e.queima -= n; ferirRecuo(p, e, n, "lava"); }
  }
  const TEMPO_MAX = 240;
  const TROCA_RECARGA = 10;
  const ENTRADA_DESMAIO = 2;
  const K_DANO = 0.48;
  const K_DANO_POKEMON = 0.18;
  const LEVEL_K = (2 * 50) / 5 + 2;
  // física e defesa
  const ATRITO = 7; // o empurrão perde força assim (por segundo)
  const EMPURRAO_MAX = 14;
  const BATIDA_MIN = 6.5; // velocidade de empurrão a partir da qual bater na parede machuca
  const GUARDA_MAX = 100;
  const JANELA_APARAR = 0.18; // levantar a guarda até isto antes do golpe chegar: apara
  const JANELA_PERFEITA = 0.16; // esquivar até isto antes do golpe chegar: esquiva perfeita
  const ESQUIVA_CD = 2.6;
  const BUFFER = 0.4; // por quanto tempo um golpe apertado na hora errada espera para sair
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const norm = (x, y, fallback = { x: 1, y: 0 }) => {
    const l = Math.hypot(x, y);
    return l > 1e-6 ? { x: x / l, y: y / l, l } : { x: fallback.x, y: fallback.y, l: 0 };
  };

  // O mesmo sorteio com semente usado no simulador do Leilão.
  function sorteDe(txt) {
    let a = 2166136261;
    for (const ch of String(txt)) a = Math.imul(a ^ ch.charCodeAt(0), 16777619);
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const stageMult = (D, n) => (D.stageMult ? D.stageMult(n || 0) : n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
  // a ficha do bicho: a do nível dele (sem transformação) ou a da Pokédex
  const spec = (p, bicho) => (bicho.ficha && !bicho.as ? bicho.ficha : p.dex.MONS[bicho.as || bicho.id]);
  // a da Pokédex, sem o nível: a velocidade e o peso não mudam com o nível (a previsão da tela anda igual ao servidor)
  const base = (p, bicho) => p.dex.MONS[bicho.as || bicho.id];
  const ativo = (j) => j.time[j.ativo];
  const emCampo = (e) => e.campo && e.bicho && e.bicho.hp > 0;
  // no alto do pulo (o meio do salto) ninguém acerta
  const noAlto = (e) => !!e.salto && e.salto.t < e.salto.total - 0.1 && e.salto.t > 0.08;
  // quem está voando alto, debaixo da terra ou no alto do pulo não pode ser acertado
  const alcancavel = (e) => emCampo(e) && !e.oculto && !noAlto(e);
  const ocupado = (e) => !!(e.canal || e.preparo || e.salto || e.sequencia || e.oculto || e.dash || e.bote);

  // golpes que viram movimento: o bicho some (voando, cavando, mergulhando ou nas sombras) e cai em cima do alvo
  const SUMIR = { fly: "voo", bounce: "voo", dig: "cova", escavar: "cova", mergulho: "mergulho", shadowforce: "sombra" };
  const DURACAO_SUMIR = { voo: 1.1, cova: 1, mergulho: 1, sombra: 0.9 };
  // golpes de giro: viram investida, e o bicho gira no caminho
  const GIROS = new Set(["gyroball", "flamewheel", "rolamento", "cambalhota", "steamroller", "drillrun"]);
  // o jeito de cada golpe (Pokémon e Galeramon; os jutsus do Naruto dizem o deles em `forma`)
  const ESTILOS = {};
  for (const [estilo, ids] of Object.entries({
    feixe: "hyperbeam solarbeam icebeam aurorabeam psybeam signalbeam flashcannon chargebeam technoblast dragonpulse psychoboost roaroftime aeroblast triattack hydropump blueflare lusterpurge mare rosado olho",
    cone: "flamethrower heatwave dragonbreath frostbreath powdersnow incinerate snarl blizzard silverwind acidspray chatter oleo cachimbo papagaiada",
    anel: "earthquake bulldoze discharge lavaplume hypervoice bugbuzz relicsong searingshot nightdaze sludgewave dazzlinggleam petaldance darkpulse curto fofoca",
    onda: "surf muddywater glaciate waterspout leafstorm gust ressaca rio desliza",
    rajada: "bulletseed pinmissile rockblast iciclespear twineedle tailslap rockslide razorleaf swift limao acai gelo",
    bumerangue: "bonemerang voltswitch uturn geargrind duzentos",
    teleguiado: "shadowball aurasphere magicalleaf hex psyshock extrasensory ominouswind mistball assombra serpente encanto",
    bomba: "sludgebomb mudbomb seedbomb octazooka weatherball sludge fusionflare fireblast",
    salto: "bodyslam stomp hijumpkick jumpkick heavyslam heatcrash acrobatics mata pancada botemata",
    zona: "whirlpool magmastorm inferno clearsmog hurricane leaftornado",
    combo: "doublekick triplekick dualchop furycutter armthrust closecombat xscissor outrage britadeira unhada chicote",
    arremesso: "stormthrow circlethrow dragontail crushgrip abraco rabada",
    investida: "wildcharge flareblitz bravebird headcharge boltstrike takedown doubleedge headsmash vcreate fusionbolt steamroller drillrun flamecharge zenheadbutt ironhead megahorn hornattack juba",
  })) for (const id of ids.split(/\s+/)) ESTILOS[id] = estilo;
  const PUXA = new Set(["whirlpool", "magmastorm", "hurricane", "leaftornado"]); // a zona puxa para o meio
  const TOMBO = new Set(["hijumpkick", "jumpkick"]); // errar o pulo machuca quem pulou
  const ALCANCE_FEIXE = 7.5;

  function habilidadeDeGolpe(id, mv) {
    if (!mv) throw new Error(`Golpe desconhecido: ${id}`);
    const poder = Math.max(0, Number(mv.p) || 0);
    const precisao = clamp(Number(mv.a) || 100, 1, 100);
    const fisico = mv.c !== "s";
    const base = {
      id, nome: mv.n || id, tipo: mv.t || "Normal", poder, precisao, fisico,
      recarga: clamp(1.5 + poder / 40, 1, 6),
      velocidade: 6 + (precisao / 100) * 4,
      largura: 0.14 + (precisao / 100) * 0.16,
      raio: 1.5,
      alcance: 5,
      mv,
    };
    if (mv.counter) return { ...base, classe: "escudo", recarga: 8 };
    if (mv.metronome) return { ...base, classe: "metronomo", recarga: 2.5 };
    if (mv.transform) return { ...base, classe: "transformar", recarga: 10 };
    if (mv.bellydrum) return { ...base, classe: "tambor", recarga: 12 };
    if (mv.heal && poder <= 0) return { ...base, classe: "cura", recarga: 8 };
    if (mv.halve) return { ...base, classe: "projetil", especial: "metade", poder: 1, recarga: 3.8, velocidade: 7.2, largura: 0.22 };
    if (mv.armadilha) return { ...base, classe: "armadilha", raio: 0.6, alcance: 5, recarga: 6, empurra: 0.6 };
    if (mv.self && poder <= 0 && !mv.foe) return { ...base, classe: "reforco", recarga: 8 };
    if (mv.foe && poder <= 0) return { ...base, classe: "debuff", recarga: mv.atordoa ? 7 : 4.5, velocidade: 4.6, largura: 0.24 };
    if (SUMIR[id] && poder > 0) {
      const jeito = SUMIR[id];
      return { ...base, classe: "sumir", jeito, duracao: DURACAO_SUMIR[jeito], raio: 1.3, alcance: 5.5, recarga: clamp(2.5 + poder / 40, 3, 6) };
    }
    if (GIROS.has(id) && poder > 0) return { ...base, classe: "investida", giro: true, alcance: 3.2, velocidade: 11, recarga: clamp(1.4 + poder / 50, 1, 3.5) };
    // os golpes do Naruto dizem como saem (corpo, projetil, area ou investida): a regra de sempre não conhece os jutsus
    if (mv.forma && poder > 0) {
      if (mv.forma === "projetil") return { ...base, classe: "projetil" };
      if (mv.forma === "area") return { ...base, classe: "area", aviso: 0.7, raio: mv.raio || 1.5, alcance: mv.alcance || 5 };
      if (mv.forma === "corpo") return { ...base, classe: "corpo", alcance: mv.alcance || 1.2, arco: Math.PI / 2 };
      if (mv.forma === "investida") return mv.giro
        ? { ...base, classe: "investida", giro: true, alcance: 3.2, velocidade: 11, recarga: clamp(1.4 + poder / 50, 1, 3.5) }
        : { ...base, classe: "investida", alcance: 3.4, velocidade: 12.5, recarga: clamp(1.3 + poder / 50, 1, 3.8) };
    }
    if (poder > 0 && mv.pri > 0) return { ...base, classe: "investida", alcance: 3, velocidade: 13, recarga: clamp(1.1 + poder / 55, 1, 3.5) };
    const estilo = poder > 0 && !mv.forma ? ESTILOS[id] : null;
    const forte = poder >= 120;
    if (estilo === "feixe") return { ...base, classe: "feixe", preparo: forte ? 0.75 : 0.35, alcance: ALCANCE_FEIXE, largura: forte ? 0.55 : 0.36, recarga: clamp(2.2 + poder / 40, 3, 7), quebraGuarda: forte, empurra: 1.1 };
    if (estilo === "cone") return { ...base, classe: "cone", preparo: 0.12, alcance: forte || poder >= 110 ? 3.6 : 3, arco: (poder >= 95 ? 85 : 70) * Math.PI / 180, recarga: clamp(1.6 + poder / 40, 2, 5), empurra: 0.8 };
    if (estilo === "anel") return { ...base, classe: "anel", raio: poder >= 95 ? 3.8 : 3.2, duracao: 0.55, recarga: clamp(2 + poder / 40, 2.5, 6), empurra: 1.2 };
    if (estilo === "onda") return { ...base, classe: "onda", alcance: 7, largura: poder >= 90 ? 3.4 : 2.6, velocidade: 6.5, recarga: clamp(2 + poder / 40, 2.5, 6), empurra: 1.4 };
    if (estilo === "rajada") return { ...base, classe: "rajada", tiros: poder >= 75 ? 4 : 3, intervalo: 0.1, velocidade: 10.5, largura: 0.13, recarga: clamp(1.6 + poder / 45, 2, 4.5), empurra: 0.45 };
    if (estilo === "bumerangue") return { ...base, classe: "bumerangue", velocidade: 8, alcance: 5, largura: 0.24, recarga: clamp(1.8 + poder / 45, 2, 4.5), empurra: 0.7 };
    if (estilo === "teleguiado") return { ...base, classe: "teleguiado", velocidade: 6.2, largura: 0.24, recarga: clamp(1.8 + poder / 40, 2, 4.5), empurra: 0.9 };
    if (estilo === "bomba") return { ...base, classe: "bomba", raio: forte || poder >= 100 ? 1.5 : 1.15, alcance: 6, recarga: clamp(1.8 + poder / 40, 2, 5), empurra: 1.1 };
    if (estilo === "salto") return { ...base, classe: "salto", duracao: 0.55, raio: 1.3, alcance: 4.6, recarga: clamp(2.2 + poder / 45, 2.5, 5.5), quebraGuarda: true, empurra: 1.4, tombo: TOMBO.has(id) };
    if (estilo === "zona") return { ...base, classe: "zona", raio: 1.6, alcance: 5, duracao: 3, puxa: PUXA.has(id), recarga: clamp(3 + poder / 40, 4, 7), empurra: 0 };
    if (estilo === "combo") return { ...base, classe: "combo", golpes: id === "triplekick" || poder >= 100 ? 3 : 2, intervalo: 0.17, alcance: 1.3, arco: Math.PI * 0.6, recarga: clamp(1.4 + poder / 45, 1.5, 4.5), empurra: 0.5 };
    if (estilo === "arremesso") return { ...base, classe: "arremesso", preparo: 0.14, alcance: 1.25, recarga: clamp(2.5 + poder / 50, 3, 5.5), agarra: true, empurra: 2.4, atordoa: 0.35 };
    if (estilo === "investida") return { ...base, classe: "investida", alcance: forte ? 4.2 : 3.6, velocidade: forte ? 13.5 : 12, recarga: clamp(1.6 + poder / 45, 1.5, 5), empurra: 1.3, quebraGuarda: forte };
    if (poder >= 100) return { ...base, classe: "area", aviso: 0.7, raio: 1.5, alcance: 5 };
    if (poder > 0 && !fisico) return { ...base, classe: "projetil" };
    if (poder > 0) return { ...base, classe: "corpo", alcance: 1.2, arco: Math.PI / 2 };
    return { ...base, classe: "nada", recarga: 1.5 };
  }

  function habilidadesDoDex(modo) {
    const D = DEX[modo] || DEX.galeramon;
    return Object.fromEntries(Object.entries(D.MOVES).map(([id, mv]) => [id, habilidadeDeGolpe(id, mv)]));
  }

  // nivel: só no modo Pokémon (a sala "só capturados" e a luta com o selvagem); sem ele, o bicho é o da Pokédex, que tem
  // os atributos do nível 50. Com ele, a ficha leva os atributos do nível (Niveis.atributos) e o dano usa o nível.
  function novoBicho(D, id, nivel = null) {
    const m = D.MONS[id];
    const at = nivel && D === PokeDex && Niveis && m.base ? Niveis.atributos(id, nivel) : null;
    const ficha = at ? { ...m, ...at } : null;
    const hp = ficha ? ficha.hp : m.hp;
    return { id, hp, max: hp, st: { atk: 0, def: 0, spd: 0 }, usos: {}, mods: [], cds: [0, 0, 0, 0], as: null, folga: false, ...(ficha && { nivel: Math.round(nivel), ficha }), ...(D.CHAKRA_MAX && { chakra: D.CHAKRA_START }) };
  }

  function timePadrao(D, lado, slot) {
    const ids = D.IDS.length >= 6 ? D.IDS : D.DEFAULT_TEAM;
    return [0, 1, 2].map((i) => ids[(lado * 3 + slot * 5 + i) % ids.length]);
  }

  function jogadoresDoLado(lados, lado) {
    const l = Array.isArray(lados) ? lados[lado] : null;
    if (Array.isArray(l)) return l;
    if (l && Array.isArray(l.jogadores)) return l.jogadores;
    if (l && Array.isArray(l.players)) return l.players;
    return l ? [l] : [];
  }

  function criarPartida(config = {}, lados = []) {
    const modo = DEX[config.modo] ? config.modo : "galeramon";
    const dex = DEX[modo];
    const formato = config.formato === "2x2" ? "2x2" : "1x1";
    const porLado = formato === "2x2" ? 2 : 1;
    const p = {
      modo, dex, formato, porLado,
      t: 0, seq: 1, fim: false, vencedor: null, empate: false,
      duracao: config.duracao || TEMPO_MAX,
      // o robô dos líderes joga melhor (reage mais rápido, apara e pune)
      // 0 fácil, 1 normal, 2 difícil (os líderes; PERFIL_ROBO)
      nivel: config.lider ? 2 : DIFICULDADES.includes(config.robo) ? DIFICULDADES.indexOf(config.robo) : config.nivel ?? 1,
      rng: sorteDe(config.seed || "ginasio"),
      lados: [{ jogadores: [] }, { jogadores: [] }],
      entidades: [], projeteis: [], areas: [], ev: [], arena: ARENA,
      // o lugar (só no modo Pokémon): o terreno que muda o jogo de cada tipo
      bioma: modo === "pokemon" ? escolherBioma(config) : null,
    };
    p.terreno = terrenoDe(p.bioma);
    for (let lado = 0; lado < 2; lado++) {
      const lista = jogadoresDoLado(lados, lado);
      for (let slot = 0; slot < porLado; slot++) {
        const raw = lista[slot] || {};
        // o robô usa o time do líder (no lado de lá) ou um dos times temáticos, sorteado
        const lider = lado === 1 && Lideres && Lideres.de(config.lider);
        const doRobo = () => (lider ? lider.times[modo].slice() : Lideres ? Lideres.timeDeRobo(modo, p.rng) : timePadrao(dex, lado, slot));
        const team = dex.cleanTeam(raw.time || raw.team || raw.bichos || doRobo());
        const j = {
          id: raw.id || `bot${lado + 1}${slot + 1}`,
          nome: raw.nome || raw.name || `Robô ${lado + 1}-${slot + 1}`,
          bot: raw.bot !== false && (raw.bot || !lista[slot]),
          lado, slot, ativo: 0, trocaCd: 0, entradaEm: 0, ...(modo === "naruto" && { substitutes: 2 }),
          time: team.map((id, i) => novoBicho(dex, id, nivelDe(raw, i, config, lado))),
        };
        // o Pokémon selvagem (a luta da grama alta): sozinho do lado de lá, com o nível e a vida que tinha no encontro
        if (lado === 1 && config.selvagem && PokeDex.MONS[config.selvagem.bicho]) {
          const s = config.selvagem, b = novoBicho(dex, s.bicho, s.nivel);
          if (s.hp != null) b.hp = clamp(Math.round(s.hp), 1, b.max);
          j.time = [b]; j.nome = PokeDex.MONS[s.bicho].n; j.selvagem = true;
        }
        p.lados[lado].jogadores.push(j);
        p.entidades.push(criarEntidade(p, j));
      }
    }
    return p;
  }

  // o nível de cada bicho do time: o que veio com o jogador (raw.niveis) ou, para o robô, o da sala (config.nivelRobo)
  function nivelDe(raw, i, config, lado) {
    if (config.modo !== "pokemon") return null;
    if (Array.isArray(raw.niveis) && raw.niveis[i]) return raw.niveis[i];
    return (!raw.id || raw.bot) && config.nivelRobo && !(lado === 1 && config.selvagem) ? config.nivelRobo : null;
  }
  function criarEntidade(p, j) {
    const x = j.lado === 0 ? -6 : 6;
    const y = (j.slot ? 2 : -2) * (j.lado === 0 ? 1 : -1);
    return {
      id: j.id, lado: j.lado, slot: j.slot, jogador: j, bicho: ativo(j),
      x, y, vx: 0, vy: 0, mira: { x: j.lado === 0 ? 1 : -1, y: 0 },
      campo: true, raio: RAIO_BICHO, invulneravel: 0, esquivaCd: 0, esquivaT: 0, esquivaEm: -9,
      dash: null, bote: null, canal: null, escudo: null, impedido: 0, oculto: null,
      // física e defesa
      kx: 0, ky: 0, atordoado: 0, cadeia: 0, atordoadoEm: -9,
      guarda: GUARDA_MAX, guardando: false, guardaDesde: -9, guardaSolta: 0,
      preparo: null, salto: null, sequencia: null, foco: false, combo: null, ia: null, buffer: null,
    };
  }

  function comandoDe(comandos, e) {
    if (!comandos) return {};
    if (Array.isArray(comandos)) return comandos.find((c) => c && (c.id === e.id || c.id === e.jogador.id)) || {};
    return comandos[e.id] || comandos[e.jogador.id] || comandos[`${e.lado}:${e.slot}`] || {};
  }

  function dirMov(c) {
    const x = Number(c.dx ?? c.x ?? c.ax ?? 0);
    const y = Number(c.dy ?? c.y ?? c.ay ?? 0);
    const d = norm(x, y, { x: 0, y: 0 });
    return d.l > 1 ? { x: d.x, y: d.y } : { x, y };
  }

  function dirMira(e, c) {
    if (c.alvo) return norm(Number(c.alvo.x) - e.x, Number(c.alvo.y) - e.y, e.mira);
    const m = c.mira || {};
    const x = Number(m.x ?? c.mx ?? c.miraX ?? 0);
    const y = Number(m.y ?? c.my ?? c.miraY ?? 0);
    const d = norm(x, y, e.mira);
    return d.l > 1e-6 ? d : { ...e.mira, l: 1 };
  }

  // o ponto mirado fica sempre dentro da quadra (quem pula ou cava não cai fora dela)
  const naQuadra = (q) => ({ x: clamp(q.x, -ARENA.w / 2 + RAIO_BICHO, ARENA.w / 2 - RAIO_BICHO), y: clamp(q.y, -ARENA.h / 2 + RAIO_BICHO, ARENA.h / 2 - RAIO_BICHO) });
  function pontoMira(e, c, hab) {
    if (c.alvo) {
      const dx = Number(c.alvo.x) - e.x, dy = Number(c.alvo.y) - e.y;
      const d = norm(dx, dy, e.mira), l = Math.min(hab.alcance || 5, d.l || 0);
      return naQuadra({ x: e.x + d.x * l, y: e.y + d.y * l });
    }
    const m = c.mira || {};
    const raw = { x: Number(m.x ?? c.mx ?? c.miraX ?? e.mira.x), y: Number(m.y ?? c.my ?? c.miraY ?? e.mira.y) };
    const d = norm(raw.x, raw.y, e.mira);
    const l = clamp(d.l > 1.2 ? d.l : hab.alcance || 5, 0.8, hab.alcance || 5);
    return naQuadra({ x: e.x + d.x * l, y: e.y + d.y * l });
  }

  // a velocidade de andar sai do atributo (o do nível 50): de VEL_MIN (Shuckle, Snorlax) a VEL_MAX (Ninjask, Jolteon)
  function velocidade(p, e) {
    const s = base(p, e.bicho).spd || 80;
    let v = (VEL_MIN + (VEL_MAX - VEL_MIN) * clamp((s - 25) / 160, 0, 1)) * stageMult(p.dex, e.bicho.st.spd || 0);
    if (p.terreno && p.terreno.length) v *= noTerreno(p, e).vel;
    if (e.guardando) v *= 0.45;
    if (e.sequencia && e.sequencia.tipo === "rajada") v *= 0.7;
    return v;
  }

  // andar para longe de onde mira custa: de frente, 100%; de lado, 90%; de ré, 60% (fugir atirando fica difícil)
  function fatorDaRe(d, mira) {
    const m = norm(mira.x, mira.y, { x: 1, y: 0 }), k = d.x * m.x + d.y * m.y;
    return k >= 0 ? 0.9 + 0.1 * k : 0.9 + (0.9 - RE) * k;
  }

  // o peso: bicho de muita vida e defesa voa menos com o golpe
  function fatorPeso(p, e) {
    const m = base(p, e.bicho) || {};
    return clamp(Math.sqrt(260 / Math.max(60, (m.hp || 130) + (m.def || 100))), 0.6, 1.45);
  }

  // devolve true se bateu na parede ou na pilastra (quem voa passa por cima das pilastras; a água funda é parede para
  // quem não nada nem voa)
  function limitar(e, p) {
    const t = p && p.terreno && p.terreno.length ? noTerreno(p, e) : null;
    const hx = ARENA.w / 2 - e.raio, hy = ARENA.h / 2 - e.raio;
    let bateu = null;
    if (e.x < -hx || e.x > hx) bateu = { x: e.x < 0 ? 1 : -1, y: 0 };
    if (e.y < -hy || e.y > hy) bateu = { x: bateu ? bateu.x : 0, y: e.y < 0 ? 1 : -1 };
    e.x = clamp(e.x, -hx, hx);
    e.y = clamp(e.y, -hy, hy);
    for (const pilar of t && t.voa ? [] : ARENA.pilares) {
      const dx = e.x - pilar.x, dy = e.y - pilar.y, d = Math.hypot(dx, dy), min = e.raio + pilar.r;
      if (d < min) {
        const n = norm(dx, dy, { x: 1, y: 0 });
        e.x = pilar.x + n.x * min;
        e.y = pilar.y + n.y * min;
        bateu = { x: n.x, y: n.y };
      }
    }
    if (t && !t.voa && !t.nada) for (const z of p.terreno) {
      if (z.tipo !== "funda") continue;
      const a = z.rx + e.raio, b = z.ry + e.raio, dx = e.x - z.x, dy = e.y - z.y, k = Math.sqrt((dx / a) ** 2 + (dy / b) ** 2);
      if (k >= 1) continue;
      // empurra para a beira da elipse, na direção do centro para fora (no meio exato, para o lado do time)
      const ux = k > 1e-6 ? dx / k : (e.lado ? a : -a), uy = k > 1e-6 ? dy / k : 0;
      e.x = z.x + ux * 1.0005; e.y = z.y + uy * 1.0005;
      const n = norm(ux / (a * a), uy / (b * b), { x: 1, y: 0 });
      bateu = { x: n.x, y: n.y };
    }
    return bateu;
  }

  function projetilBateParede(pr) {
    if (Math.abs(pr.x) > ARENA.w / 2 - pr.raio || Math.abs(pr.y) > ARENA.h / 2 - pr.raio) return true;
    return ARENA.pilares.some((p) => Math.hypot(pr.x - p.x, pr.y - p.y) < pr.raio + p.r);
  }

  function aplicarMod(p, e, delta, tempo = 6) {
    const b = e.bicho;
    const feito = {};
    for (const [k, v] of Object.entries(delta || {})) {
      const antes = b.st[k] || 0;
      b.st[k] = clamp(antes + v, -3, 3);
      feito[k] = b.st[k] - antes;
    }
    if (Object.values(feito).some((v) => v)) b.mods.push({ t: tempo, delta: feito });
    p.ev.push({ tipo: "atributo", id: e.id, delta: feito });
  }

  function atualizarMods(b, dt) {
    for (let i = b.mods.length - 1; i >= 0; i--) {
      const m = b.mods[i];
      m.t -= dt;
      if (m.t > 0) continue;
      for (const [k, v] of Object.entries(m.delta)) b.st[k] = clamp((b.st[k] || 0) - v, -3, 3);
      b.mods.splice(i, 1);
    }
  }

  function prepararGolpe(p, hab) {
    if (!hab.mv.randtype) return hab;
    const opts = Array.isArray(hab.mv.randtype) ? hab.mv.randtype : Object.keys(p.dex.TYPES).filter((t) => t !== "Normal");
    return { ...hab, tipo: opts[Math.floor(p.rng() * opts.length)] };
  }

  function alvoMaisPerto(p, e, de = e) {
    let best = null, bd = Infinity;
    for (const o of p.entidades) if (o.lado !== e.lado && emCampo(o)) {
      const d = dist(de, o);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  // ---------- usar um golpe ----------
  function usarGolpe(p, e, idx, c = {}) {
    if (!emCampo(e) || e.impedido > 0 || e.atordoado > 0 || ocupado(e)) return false;
    const b = e.bicho, spc = spec(p, b), key = spc.moves[idx], mv = p.dex.MOVES[key];
    if (!mv || b.cds[idx] > 0 || (p.modo === "naruto" && b.chakra < (mv.custo || 0))) return false;
    let hab = prepararGolpe(p, habilidadeDeGolpe(key, mv));
    if (spc.abil === "truant") {
      if (b.folga) {
        b.folga = false;
        b.cds[idx] = Math.max(b.cds[idx], 1);
        p.ev.push({ tipo: "mensagem", texto: `${spc.n} está fazendo corpo mole.` });
        return false;
      }
      b.folga = true;
    }
    if (mv.max) {
      if ((b.usos[key] || 0) >= mv.max) { p.ev.push({ tipo: "falhou", id: e.id, golpe: key }); return false; }
      b.usos[key] = (b.usos[key] || 0) + 1;
    }
    b.cds[idx] = hab.recarga;
    if (p.modo === "naruto") b.chakra -= mv.custo || 0;
    soltarGuarda(e);
    if (hab.classe === "metronomo") {
      const opts = Object.entries(p.dex.MOVES).filter(([, x]) => x.p > 0);
      const [mid, mmv] = opts[Math.floor(p.rng() * opts.length)];
      hab = prepararGolpe(p, habilidadeDeGolpe(mid, mmv));
    }
    const mira = dirMira(e, c);
    e.mira = { x: mira.x, y: mira.y };
    const ponto = pontoMira(e, c, hab);
    p.ev.push({ tipo: "golpe", id: e.id, golpe: key, classe: hab.classe, elemento: hab.tipo, ...(hab.preparo && { preparo: hab.preparo }) });
    // golpes com preparo: o bicho fica parado mirando (dá para fugir, e quem acerta nele antes cancela o golpe)
    if (hab.preparo) {
      e.preparo = { t: hab.preparo, total: hab.preparo, hab, mira: { x: mira.x, y: mira.y }, ponto, golpe: key };
      e.vx = 0; e.vy = 0;
      return true;
    }
    executarGolpe(p, e, hab, mira, ponto, c);
    return true;
  }

  // o alvo do bote: o outro mais perto na frente da mira, longe demais para o golpe mas a menos de BOTE_MAX além dele
  function boteDe(p, e, hab, mira) {
    let melhor = null;
    for (const o of p.entidades) {
      if (o.lado === e.lado || !alcancavel(o) || o.salto || o.oculto) continue; // no alto ou sumido, não dá para ir atrás
      const dx = o.x - e.x, dy = o.y - e.y, d = Math.hypot(dx, dy), alcance = hab.alcance + o.raio;
      if (d <= alcance * 0.95 || d > alcance + BOTE_MAX) continue;
      if (Math.acos(clamp((dx * mira.x + dy * mira.y) / (d || 1), -1, 1)) > BOTE_ARCO) continue;
      if (!melhor || d < melhor.d) melhor = { d, x: dx / d, y: dy / d, falta: d - alcance * 0.7 };
    }
    return melhor;
  }
  function executarGolpe(p, e, hab, mira, ponto, c = {}) {
    if (PERTO.includes(hab.classe) && !c.semBote) {
      const b = boteDe(p, e, hab, mira);
      if (b) {
        const m = { x: b.x, y: b.y };
        e.mira = { ...m };
        e.bote = { x: b.x, y: b.y, falta: b.falta, hab, mira: m, ponto, c };
        p.ev.push({ tipo: "bote", id: e.id, dx: b.x, dy: b.y, falta: b.falta, elemento: hab.tipo });
        return;
      }
    }
    const b = e.bicho, mv = hab.mv;
    if (hab.classe === "nada") return;
    if (hab.classe === "escudo") { e.escudo = { t: 1, tipo: mv.counter }; return; }
    if (hab.classe === "tambor") {
      if (b.hp > Math.floor(b.max / 2) && b.st.atk < 3) {
        b.hp -= Math.floor(b.max / 2);
        b.st.atk = 3;
        p.ev.push({ tipo: "tambor", id: e.id, hp: b.hp });
      }
      return;
    }
    if (hab.classe === "transformar") {
      const alvo = alvoMaisPerto(p, e);
      if (alvo && !alvo.oculto) { b.as = alvo.bicho.as || alvo.bicho.id; b.st = { ...alvo.bicho.st }; p.ev.push({ tipo: "transformar", id: e.id, alvo: alvo.id }); }
      return;
    }
    if (hab.classe === "cura") { e.canal = { t: 0.8, heal: mv.heal || 0.5 }; e.vx = 0; e.vy = 0; return; }
    if (hab.classe === "reforco") { aplicarMod(p, e, mv.self || {}); return; }

    const novoProjetil = (o) => p.projeteis.push({ id: p.seq++, lado: e.lado, dono: e.id, x: e.x + mira.x * 0.45, y: e.y + mira.y * 0.45, dx: mira.x, dy: mira.y, v: hab.velocidade, raio: hab.largura, vida: 1.8, hab, forma: "reto", ...o });
    const novaArea = (o) => p.areas.push({ id: p.seq++, lado: e.lado, dono: e.id, x: ponto.x, y: ponto.y, r: hab.raio, t: hab.aviso || 0.7, hab, forma: "queda", ...o });
    switch (hab.classe) {
      case "corpo": acertarCorpo(p, e, hab, mira); break;
      case "sumir": sumir(p, e, c, hab, ponto); break;
      case "investida": e.dash = { x: mira.x, y: mira.y, falta: hab.alcance, hab, hit: new Set() }; break;
      case "area": novaArea({}); break;
      case "projetil": case "debuff": novoProjetil({}); break;
      case "teleguiado": novoProjetil({ forma: "teleguiado", vida: 2.4 }); break;
      case "bumerangue": novoProjetil({ forma: "bumerangue", vida: 3, ida: hab.alcance, hit: [] }); break;
      case "rajada": e.sequencia = { tipo: "rajada", hab, falta: hab.tiros, prox: 0, n: 0 }; break;
      case "combo": e.sequencia = { tipo: "combo", hab, falta: hab.golpes, prox: 0, n: 0 }; break;
      case "bomba": {
        const d = dist(e, ponto);
        novaArea({ forma: "bomba", t: clamp(d / 9, 0.3, 0.75), aviso: clamp(d / 9, 0.3, 0.75), de: { x: e.x, y: e.y } });
        break;
      }
      case "armadilha": {
        const minhas = p.areas.filter((a) => a.forma === "armadilha" && a.dono === e.id);
        if (minhas.length >= 3) p.areas.splice(p.areas.indexOf(minhas[0]), 1);
        novaArea({ forma: "armadilha", t: 14, arma: 0.6, aviso: 0.6, de: { x: e.x, y: e.y } });
        break;
      }
      case "zona": novaArea({ forma: "zona", t: hab.duracao, aviso: hab.duracao, tique: 0.25, hit: [] }); break;
      case "anel": p.areas.push({ id: p.seq++, lado: e.lado, dono: e.id, x: e.x, y: e.y, r: hab.raio, t: hab.duracao, aviso: hab.duracao, hab, forma: "anel", hit: [] }); break;
      case "onda": {
        const meio = { x: e.x + mira.x * 0.6, y: e.y + mira.y * 0.6 };
        p.areas.push({ id: p.seq++, lado: e.lado, dono: e.id, x: meio.x, y: meio.y, dx: mira.x, dy: mira.y, r: hab.largura / 2, t: hab.alcance / hab.velocidade, aviso: hab.alcance / hab.velocidade, v: hab.velocidade, hab, forma: "onda", hit: [] });
        break;
      }
      case "feixe": dispararFeixe(p, e, hab, mira); break;
      case "cone": soprarCone(p, e, hab, mira); break;
      case "salto": {
        e.salto = { t: hab.duracao, total: hab.duracao, de: { x: e.x, y: e.y }, para: ponto, hab };
        e.vx = 0; e.vy = 0;
        p.ev.push({ tipo: "pulou", id: e.id, de: { x: e.x, y: e.y }, para: { ...ponto }, elemento: hab.tipo });
        break;
      }
      case "arremesso": agarrar(p, e, hab, mira); break;
    }
    if (mv.self && hab.classe !== "reforco") aplicarMod(p, e, mv.self);
  }

  // some agora e volta no ponto mirado quando a área cair (os dois acabam no mesmo passo)
  function sumir(p, e, c, hab, para) {
    e.oculto = { jeito: hab.jeito, t: hab.duracao, total: hab.duracao, de: { x: e.x, y: e.y }, para };
    e.vx = 0; e.vy = 0;
    p.areas.push({ id: p.seq++, lado: e.lado, dono: e.id, x: para.x, y: para.y, r: hab.raio, t: hab.duracao, aviso: hab.duracao, hab, forma: "queda" });
    p.ev.push({ tipo: "sumiu", id: e.id, jeito: hab.jeito, elemento: hab.tipo, de: { ...e.oculto.de }, para: { ...para } });
  }

  function naFrente(e, o, mira, alcance, arco) {
    const dx = o.x - e.x, dy = o.y - e.y, d = Math.hypot(dx, dy);
    if (d > alcance + o.raio) return false;
    const frente = (dx / (d || 1)) * mira.x + (dy / (d || 1)) * mira.y;
    return d < 0.3 || frente >= Math.cos(arco / 2);
  }

  function acertarCorpo(p, e, hab, mira = e.mira, op = {}) {
    let acertou = false;
    for (const o of p.entidades) if (o.lado !== e.lado && alcancavel(o) && naFrente(e, o, mira, hab.alcance, hab.arco || Math.PI / 2)) {
      if (aplicarDano(p, e, o, hab, { dir: { x: mira.x, y: mira.y }, ...op })) acertou = true;
    }
    return acertou;
  }

  // o agarrão: passa pela guarda e arremessa longe
  function agarrar(p, e, hab, mira) {
    let pegou = null;
    for (const o of p.entidades) if (o.lado !== e.lado && alcancavel(o) && naFrente(e, o, mira, hab.alcance, Math.PI * 0.7)) { pegou = o; break; }
    if (!pegou) { p.ev.push({ tipo: "errou", id: e.id }); return; }
    p.ev.push({ tipo: "agarrou", id: e.id, alvo: pegou.id });
    aplicarDano(p, e, pegou, hab, { dir: { x: mira.x, y: mira.y } });
  }

  function dispararFeixe(p, e, hab, mira) {
    const ox = e.x + mira.x * 0.35, oy = e.y + mira.y * 0.35;
    let len = hab.alcance;
    // a parede e as pilastras param o feixe
    if (mira.x) len = Math.min(len, ((mira.x > 0 ? ARENA.w / 2 : -ARENA.w / 2) - ox) / mira.x);
    if (mira.y) len = Math.min(len, ((mira.y > 0 ? ARENA.h / 2 : -ARENA.h / 2) - oy) / mira.y);
    for (const pl of ARENA.pilares) {
      const rx = pl.x - ox, ry = pl.y - oy, ao = rx * mira.x + ry * mira.y, lat = Math.abs(rx * mira.y - ry * mira.x);
      if (ao > 0 && lat < pl.r) len = Math.min(len, ao - Math.sqrt(pl.r * pl.r - lat * lat));
    }
    len = Math.max(0.3, len);
    for (const o of p.entidades) if (o.lado !== e.lado && alcancavel(o)) {
      const rx = o.x - ox, ry = o.y - oy, ao = rx * mira.x + ry * mira.y, lat = Math.abs(rx * mira.y - ry * mira.x);
      if (ao > -o.raio && ao < len + o.raio && lat < hab.largura + o.raio) aplicarDano(p, e, o, hab, { dir: { x: mira.x, y: mira.y }, distante: true });
    }
    p.areas.push({ id: p.seq++, lado: e.lado, dono: e.id, x: ox, y: oy, dx: mira.x, dy: mira.y, len, r: hab.largura, t: 0.28, aviso: 0.28, hab, forma: "feixe", feito: true });
  }

  function soprarCone(p, e, hab, mira) {
    for (const o of p.entidades) if (o.lado !== e.lado && alcancavel(o) && naFrente(e, o, mira, hab.alcance, hab.arco)) aplicarDano(p, e, o, hab, { de: e });
    p.areas.push({ id: p.seq++, lado: e.lado, dono: e.id, x: e.x, y: e.y, dx: mira.x, dy: mira.y, len: hab.alcance, arco: hab.arco, r: hab.alcance, t: 0.35, aviso: 0.35, hab, forma: "cone", feito: true });
  }

  function calcularDano(p, atacante, defensor, hab, op = {}) {
    const D = p.dex, mv = hab.mv || {};
    const me = atacante.bicho, foe = defensor.bicho;
    const as = spec(p, me), ds = spec(p, foe);
    const tipo = hab.tipo || mv.t || "Normal";
    const eff = D.effect(tipo, ds.types || ["Normal"]);
    const especial = mv.c === "s" && as.sat != null;
    if (eff === 0) return { dano: 0, eff, crit: false, especial };
    if (ds.abil === "wonderguard" && eff <= 1) return { dano: 0, eff, crit: false, especial };
    if (mv.halve || hab.especial === "metade") return { dano: Math.max(1, Math.floor(foe.hp / 2)), eff, crit: false, especial };
    const poder = mv.hpscale ? Math.max(1, Math.floor((hab.poder * me.hp) / me.max)) : Math.max(1, hab.poder || mv.p || 1);
    const huge = !especial && as.abil === "hugepower" ? 2 : 1;
    const A = (as[especial ? "sat" : "atk"] || as.atk || 80) * huge * stageMult(D, me.st.atk || 0);
    const Df = (ds[especial ? "sdf" : "def"] || ds.def || 80) * stageMult(D, foe.st.def || 0);
    const crit = op.critico != null ? op.critico : p.rng() < (mv.crit ? 1 / 4 : 1 / 16);
    const stab = (as.types || []).includes(tipo) ? 1.5 : 1;
    const variacao = op.variacao != null ? op.variacao : 0.9 + p.rng() * 0.1;
    const escala = p.modo === "pokemon" ? K_DANO_POKEMON : K_DANO;
    const nivelK = me.nivel ? (2 * me.nivel) / 5 + 2 : LEVEL_K; // o nível de quem bate (a conta dos jogos)
    let dano = ((nivelK * poder * (A / Df)) / 50 + 2) * stab * eff * (crit ? 1.5 : 1) * variacao * escala;
    return { dano: Math.max(1, Math.floor(dano)), eff, crit, especial };
  }

  // a guarda pega o que vem de frente (um pouco mais de meia volta)
  function pegaNaGuarda(de, dir) {
    return de.guardando && -(dir.x * de.mira.x + dir.y * de.mira.y) > -0.25;
  }

  function atordoar(p, e, t, motivo) {
    if (!emCampo(e) || t <= 0) return;
    // golpes seguidos atordoam cada vez menos: não dá para prender ninguém para sempre
    e.cadeia = p.t - e.atordoadoEm < 1.6 ? e.cadeia + 1 : 0;
    t *= Math.pow(0.55, e.cadeia);
    if (t < 0.05) return;
    e.atordoadoEm = p.t;
    e.atordoado = Math.max(e.atordoado, t);
    soltarGuarda(e);
    e.dash = null; e.bote = null; e.canal = null;
    if (e.sequencia) e.sequencia = null;
    if (e.preparo) { p.ev.push({ tipo: "interrompido", id: e.id, golpe: e.preparo.golpe }); e.preparo = null; }
    p.ev.push({ tipo: "atordoado", id: e.id, t: e.atordoado, motivo });
  }

  function empurrar(e, dir, forca) {
    e.kx += dir.x * forca; e.ky += dir.y * forca;
    const l = Math.hypot(e.kx, e.ky);
    if (l > EMPURRAO_MAX) { e.kx *= EMPURRAO_MAX / l; e.ky *= EMPURRAO_MAX / l; }
  }

  // op: dir (para onde empurra), de (ponto de onde vem), fator (parte do poder), empurra, projetil, distante
  function aplicarDano(p, atacante, defensor, hab, op = {}) {
    if (!emCampo(defensor) || defensor.oculto || noAlto(defensor)) { p.ev.push({ tipo: "esquivou", id: defensor.id }); return false; }
    if (defensor.invulneravel > 0) {
      p.ev.push({ tipo: "esquivou", id: defensor.id });
      // a esquiva no último instante: recargas adiantadas e o próximo golpe mais forte (uma vez por esquiva)
      if (!defensor.perfeitaUsada && p.t - defensor.esquivaEm <= JANELA_PERFEITA) {
        defensor.perfeitaUsada = true; defensor.foco = true;
        const cds = defensor.bicho.cds;
        for (let i = 0; i < cds.length; i++) cds[i] = Math.max(0, cds[i] - 1.2);
        defensor.esquivaCd = Math.max(0, defensor.esquivaCd - 1);
        p.ev.push({ tipo: "perfeita", id: defensor.id, de: atacante.id });
      }
      return false;
    }
    const origem = op.de || atacante;
    const dir = op.dir ? norm(op.dir.x, op.dir.y) : norm(defensor.x - origem.x, defensor.y - origem.y, atacante.mira);
    let bloqueado = false;
    if (!hab.agarra && pegaNaGuarda(defensor, dir)) {
      if (p.t - defensor.guardaDesde <= JANELA_APARAR) {
        p.ev.push({ tipo: "aparou", id: defensor.id, de: atacante.id, x: defensor.x, y: defensor.y });
        defensor.guarda = Math.min(GUARDA_MAX, defensor.guarda + 15);
        if (op.projetil) refletir(p, op.projetil, defensor, atacante);
        else if (!op.distante && emCampo(atacante) && atacante !== defensor) { empurrar(atacante, { x: -dir.x, y: -dir.y }, 5); atordoar(p, atacante, 0.55, "aparado"); }
        return "aparou";
      }
      bloqueado = true;
    }
    const r = calcularDano(p, atacante, defensor, hab);
    if (r.dano <= 0) { p.ev.push({ tipo: "imune", id: defensor.id, eff: r.eff }); return true; }
    // em casa no terreno (o de Água na água, o de Fogo na lava...), bate mais forte
    const casa = p.terreno && p.terreno.length && emCampo(atacante) && noTerreno(p, atacante).casa;
    let dano = r.dano * (op.fator ?? 1) * (atacante.foco ? 1.3 : 1) * (casa ? DANO_CASA : 1);
    if (atacante.foco) atacante.foco = false;
    if (bloqueado) dano *= 0.3;
    dano = Math.max(1, Math.floor(dano));
    const b = defensor.bicho, antes = b.hp;
    b.hp = Math.max(0, b.hp - Math.min(b.hp, dano));
    if (defensor.canal) defensor.canal = null;
    // o combo de quem bate (só para mostrar)
    const combo = atacante.combo && p.t - atacante.combo.em < 1.1 ? atacante.combo.n + 1 : 1;
    atacante.combo = { n: combo, em: p.t };
    p.ev.push({ tipo: "dano", de: atacante.id, em: defensor.id, dano: antes - b.hp, hp: b.hp, eff: r.eff, crit: r.crit, elemento: hab.tipo, classe: hab.classe, ...(bloqueado && { bloqueado: true }), ...(combo > 1 && { combo }), ...(casa && { terreno: true }) });
    // o empurrão: pelo poder, pelo peso e pela guarda; quem está no bote ou no combo fica firme (só perde vida)
    const firme = !!(defensor.bote || (defensor.sequencia && defensor.sequencia.tipo === "combo"));
    const empurra = firme ? 0 : (hab.empurra ?? 1) * (op.empurra ?? 1);
    if (empurra > 0 && b.hp > 0) {
      const forca = (2.2 + (hab.poder || 40) / 30) * empurra * fatorPeso(p, defensor) * (r.crit ? 1.25 : 1) * (bloqueado ? 0.3 : 1) * (op.fator != null ? Math.max(0.5, op.fator) : 1);
      empurrar(defensor, dir, forca);
      if (!bloqueado) atordoar(p, defensor, clamp((forca - 3) * 0.06, 0, 0.45) + (hab.atordoa || 0), "golpe");
    }
    if (bloqueado) {
      defensor.guarda -= 12 + (60 * (antes - b.hp)) / b.max + (hab.quebraGuarda ? 45 : 0);
      if (defensor.guarda <= 0) {
        defensor.guarda = 0;
        p.ev.push({ tipo: "guardaQuebrou", id: defensor.id });
        defensor.atordoadoEm = -9;
        atordoar(p, defensor, 1.1, "guarda");
      }
    }
    if (hab.mv && hab.mv.foe && b.hp > 0 && p.rng() * 100 < (hab.mv.chance ?? 100)) aplicarMod(p, defensor, hab.mv.foe);
    if (hab.mv && hab.mv.drain && atacante.bicho.hp > 0) curar(p, atacante, (antes - b.hp) * hab.mv.drain, "drain");
    if (hab.mv && hab.mv.recoil && atacante.bicho.hp > 0) ferirRecuo(p, atacante, Math.max(1, Math.floor((antes - b.hp) * hab.mv.recoil)));
    if (defensor.escudo && defensor.escudo.t > 0 && defensor.escudo.tipo === (r.especial ? "s" : "p") && atacante.bicho.hp > 0) {
      atacante.bicho.hp = Math.max(0, atacante.bicho.hp - Math.min(atacante.bicho.hp, (antes - b.hp) * 2));
      p.ev.push({ tipo: "contra", de: defensor.id, em: atacante.id, hp: atacante.bicho.hp });
      if (atacante.bicho.hp <= 0) desmaiar(p, atacante);
    }
    if (b.hp <= 0) desmaiar(p, defensor);
    return true;
  }

  // aparado: o projétil volta contra quem atirou, mais rápido
  function refletir(p, pr, defensor, atacante) {
    const d = emCampo(atacante) ? norm(atacante.x - pr.x, atacante.y - pr.y, { x: -pr.dx, y: -pr.dy }) : { x: -pr.dx, y: -pr.dy };
    Object.assign(pr, { lado: defensor.lado, dono: defensor.id, dx: d.x, dy: d.y, v: pr.v * 1.2, vida: 1.6, forma: pr.forma === "teleguiado" ? "teleguiado" : "reto", refletido: true, hit: [] });
    p.ev.push({ tipo: "refletiu", id: defensor.id, projetil: pr.id });
  }

  function curar(p, e, valor, motivo = "cura") {
    const b = e.bicho;
    const h = Math.min(b.max - b.hp, Math.max(1, Math.floor(valor)));
    if (h > 0) { b.hp += h; p.ev.push({ tipo: "cura", id: e.id, hp: b.hp, motivo }); }
  }

  function ferirRecuo(p, e, dano, tipo = "recuo") {
    e.bicho.hp = Math.max(0, e.bicho.hp - Math.min(e.bicho.hp, dano));
    p.ev.push({ tipo, id: e.id, hp: e.bicho.hp, dano });
    if (e.bicho.hp <= 0) desmaiar(p, e);
  }

  function desmaiar(p, e) {
    if (!e.campo) return;
    e.campo = false; e.dash = null; e.bote = null; e.canal = null; e.escudo = null; e.oculto = null;
    e.preparo = null; e.salto = null; e.sequencia = null; e.buffer = null; e.atordoado = 0; e.kx = 0; e.ky = 0; soltarGuarda(e);
    e.jogador.entradaEm = temReserva(e.jogador) ? ENTRADA_DESMAIO : 0;
    p.ev.push({ tipo: "desmaiou", id: e.id, bicho: e.bicho.id });
  }

  function temReserva(j) {
    return j.time.some((m, i) => i !== j.ativo && m.hp > 0);
  }

  function trocar(p, e, idx, forcar = false) {
    const j = e.jogador, novo = j.time[idx];
    if (!novo || novo.hp <= 0 || idx === j.ativo) return false;
    if (!forcar && (j.trocaCd > 0 || e.oculto || e.salto || e.atordoado > 0)) return false;
    e.bicho.mods.length = 0;
    e.bicho.st = { atk: 0, def: 0, spd: 0 };
    e.bicho.as = null;
    j.ativo = idx;
    e.bicho = ativo(j);
    e.campo = true; e.invulneravel = Math.max(e.invulneravel, 0.45); e.canal = null; e.dash = null; e.bote = null; e.oculto = null;
    e.preparo = null; e.salto = null; e.sequencia = null; e.buffer = null; e.atordoado = 0; e.kx = 0; e.ky = 0; e.foco = false; soltarGuarda(e);
    if (!forcar) j.trocaCd = TROCA_RECARGA;
    const spawn = spawnDe(j.lado, j.slot);
    e.x = spawn.x; e.y = spawn.y; e.vx = 0; e.vy = 0;
    p.ev.push({ tipo: "troca", id: e.id, ativo: idx, bicho: e.bicho.id });
    return true;
  }

  function spawnDe(lado, slot) {
    return { x: lado === 0 ? -6.5 : 6.5, y: (slot ? 2.2 : -2.2) * (lado === 0 ? 1 : -1) };
  }

  function atualizarEntrada(p, e, dt) {
    const j = e.jogador;
    if (e.campo || !j.entradaEm) return;
    j.entradaEm -= dt;
    if (j.entradaEm > 0) return;
    const idx = j.time.findIndex((m, i) => i !== j.ativo && m.hp > 0);
    if (idx >= 0) trocar(p, e, idx, true);
    j.entradaEm = 0;
  }

  // ---------- defesa ----------
  function soltarGuarda(e) {
    if (e.guardando) { e.guardando = false; e.guardaSolta = 0.5; }
  }
  // segurar a guarda (o comando vem a cada passo): sobe na hora em que começa
  function guardar(p, e, quer) {
    const pode = quer && emCampo(e) && !e.atordoado && !ocupado(e) && e.esquivaT <= 0 && e.guarda > 8;
    if (pode && !e.guardando) {
      e.guardando = true; e.guardaDesde = p.t;
      p.ev.push({ tipo: "guarda", id: e.id });
    } else if (!pode && e.guardando) soltarGuarda(e);
  }

  function esquivar(p, e, c) {
    if (!emCampo(e) || e.esquivaCd > 0 || e.oculto || e.atordoado > 0 || e.salto || e.preparo) return;
    if (p.modo === "naruto") {
      if (e.jogador.substitutes <= 0 || e.bicho.chakra < 20) return;
      e.jogador.substitutes--;
      e.bicho.chakra -= 20;
    }
    soltarGuarda(e);
    if (e.sequencia) e.sequencia = null;
    const mov = dirMov(c), d = norm(mov.x, mov.y, e.mira);
    e.invulneravel = Math.max(e.invulneravel, 0.25);
    e.esquivaCd = p.modo === "naruto" ? 5 : ESQUIVA_CD;
    e.esquivaT = 0.18;
    e.esquivaEm = p.t;
    e.perfeitaUsada = false;
    e.vx = d.x * 8;
    e.vy = d.y * 8;
    e.kx *= 0.3; e.ky *= 0.3;
    p.ev.push({ tipo: "esquiva", id: e.id, dx: d.x, dy: d.y });
  }

  // ---------- movimento (o mesmo no servidor e na previsão da tela) ----------
  function mover(e, dt, c, p, previsao = false) {
    if (!emCampo(e)) return;
    if (e.oculto) {
      const o = e.oculto;
      o.t = Math.max(0, o.t - dt);
      const k = 1 - o.t / o.total;
      e.x = o.de.x + (o.para.x - o.de.x) * k; e.y = o.de.y + (o.para.y - o.de.y) * k;
      if (o.t <= 0) {
        limitar(e, p); e.oculto = null; e.invulneravel = Math.max(e.invulneravel, 0.1);
        p.ev.push({ tipo: "voltou", id: e.id, jeito: o.jeito, x: e.x, y: e.y });
      }
      return;
    }
    if (e.salto) {
      const s = e.salto;
      s.t = Math.max(0, s.t - dt);
      const k = 1 - s.t / s.total;
      e.x = s.de.x + (s.para.x - s.de.x) * k; e.y = s.de.y + (s.para.y - s.de.y) * k;
      if (s.t <= 0) { limitar(e, p); e.salto = null; if (!previsao) aterrissar(p, e, s.hab); }
      return;
    }
    // o empurrão: escorrega, perde força e, forte, machuca na parede
    const empurrado = Math.hypot(e.kx, e.ky);
    if (empurrado > 0.05) {
      e.x += e.kx * dt; e.y += e.ky * dt;
      // no gelo, quem não é do gelo escorrega mais longe
      const gelo = p && p.terreno && p.terreno.length ? noTerreno(p, e) : null;
      const f = Math.exp(-ATRITO * (gelo && gelo.zona && gelo.zona.tipo === "gelo" && !gelo.casa ? ATRITO_GELO : 1) * dt); e.kx *= f; e.ky *= f;
    } else { e.kx = 0; e.ky = 0; }
    if (e.bote) { // o bote: avança reto até o alcance e só então bate (na previsão da tela, só anda)
      const b = e.bote, passo = Math.min(b.falta, BOTE_VEL * dt);
      e.x += b.x * passo; e.y += b.y * passo; b.falta -= passo; e.vx = b.x * BOTE_VEL; e.vy = b.y * BOTE_VEL; limitar(e, p);
      // chegou: bate e fica um instante parado se recuperando do bote (a brecha de quem apanhou)
      if (b.falta <= 1e-6) { e.bote = null; e.impedido = Math.max(e.impedido || 0, BOTE_RECUPERA); if (!previsao && b.hab) executarGolpe(p, e, b.hab, b.mira, b.ponto, { ...b.c, semBote: true }); }
      return;
    }
    if (e.dash) {
      const d = Math.min(e.dash.falta, e.dash.hab.velocidade * dt);
      e.x += e.dash.x * d; e.y += e.dash.y * d; e.dash.falta -= d; limitar(e, p);
      for (const o of previsao ? [] : p.entidades) {
        if (!e.dash) break; // aparado: a investida acabou ali
        if (o.lado !== e.lado && alcancavel(o) && !e.dash.hit.has(o.id) && dist(e, o) < e.raio + o.raio + 0.35) { e.dash.hit.add(o.id); aplicarDano(p, e, o, e.dash.hab, { dir: { x: e.dash.x, y: e.dash.y } }); }
      }
      if (e.dash && e.dash.falta <= 0) e.dash = null;
      return;
    }
    let vx = 0, vy = 0;
    if (!e.canal && !(e.impedido > 0) && !(e.atordoado > 0) && !e.preparo) {
      if (e.esquivaT > 0) {
        e.x += e.vx * dt; e.y += e.vy * dt; e.esquivaT -= dt; bater(p, e, limitar(e, p), empurrado, previsao); return;
      }
      const m = dirMov(c);
      const d = norm(m.x, m.y, { x: 0, y: 0 });
      // escorregando forte, o controle volta aos poucos
      const controle = clamp(1 - empurrado / 7, 0, 1);
      const v = d.l > 1e-6 ? velocidade(p, e) * controle * fatorDaRe(d, e.mira) : 0;
      vx = d.x * v; vy = d.y * v;
    }
    e.vx = vx; e.vy = vy;
    e.x += vx * dt; e.y += vy * dt;
    bater(p, e, limitar(e, p), empurrado, previsao);
  }

  // bateu na parede ou na pilastra escorregando forte: quica, leva um pouco e fica tonto
  function bater(p, e, normal, forca, previsao) {
    if (!normal) return;
    const contra = e.kx * normal.x + e.ky * normal.y;
    if (contra >= 0) return;
    e.kx -= 1.6 * contra * normal.x; e.ky -= 1.6 * contra * normal.y; // quica (perde força)
    e.kx *= 0.35; e.ky *= 0.35;
    if (previsao || forca < BATIDA_MIN) return;
    ferirRecuo(p, e, Math.max(1, Math.floor(e.bicho.max * 0.035 * (forca / BATIDA_MIN))), "batida");
    if (emCampo(e)) { e.atordoadoEm = -9; atordoar(p, e, 0.4, "parede"); }
  }

  // o fim do salto: a pancada no chão em volta
  function aterrissar(p, e, hab) {
    let acertou = false;
    for (const o of p.entidades) if (o.lado !== e.lado && alcancavel(o) && dist(e, o) <= hab.raio + o.raio) {
      if (aplicarDano(p, e, o, hab, { de: e })) acertou = true;
    }
    p.ev.push({ tipo: "aterrissou", id: e.id, x: e.x, y: e.y, r: hab.raio, elemento: hab.tipo, acertou });
    if (!acertou && hab.tombo) { ferirRecuo(p, e, Math.max(1, Math.floor(e.bicho.max / 5)), "tombo"); atordoar(p, e, 0.6, "tombo"); }
  }

  // rajada (vários tiros seguidos) e combo (vários golpes seguidos, avançando)
  function atualizarSequencia(p, e, dt, c) {
    const s = e.sequencia;
    if (!s) return;
    s.prox -= dt;
    if (s.prox > 0) return;
    const hab = s.hab, mira = e.mira;
    if (s.tipo === "rajada") {
      const abre = (s.n - (hab.tiros - 1) / 2) * 0.07;
      const d = { x: mira.x * Math.cos(abre) - mira.y * Math.sin(abre), y: mira.x * Math.sin(abre) + mira.y * Math.cos(abre) };
      p.projeteis.push({ id: p.seq++, lado: e.lado, dono: e.id, x: e.x + d.x * 0.45, y: e.y + d.y * 0.45, dx: d.x, dy: d.y, v: hab.velocidade, raio: hab.largura, vida: 0.75, hab, forma: "reto", fator: 1.25 / hab.tiros });
      p.ev.push({ tipo: "tiro", id: e.id, n: s.n, elemento: hab.tipo });
    } else {
      const ultimo = s.falta === 1;
      empurrar(e, mira, 2.2);
      p.ev.push({ tipo: "combo", id: e.id, n: s.n, ultimo, elemento: hab.tipo, mira: { ...mira } });
      acertarCorpo(p, e, ultimo ? { ...hab, empurra: 2, quebraGuarda: true } : hab, mira, { fator: ultimo ? 0.55 : 0.4 });
    }
    s.n++; s.falta--; s.prox = hab.intervalo;
    if (s.falta <= 0) e.sequencia = null;
  }

  function atualizarProjetil(p, pr, dt) {
    if (pr.forma === "teleguiado") {
      // vira devagar para o inimigo mais perto
      let alvo = null, bd = 6;
      for (const o of p.entidades) if (o.lado !== pr.lado && alcancavel(o)) { const d = Math.hypot(o.x - pr.x, o.y - pr.y); if (d < bd) { bd = d; alvo = o; } }
      if (alvo) {
        const a = Math.atan2(pr.dy, pr.dx), b = Math.atan2(alvo.y - pr.y, alvo.x - pr.x);
        let da = b - a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        const na = a + clamp(da, -3.2 * dt, 3.2 * dt);
        pr.dx = Math.cos(na); pr.dy = Math.sin(na);
      }
    } else if (pr.forma === "bumerangue") {
      const dono = p.entidades.find((e) => e.id === pr.dono);
      if (pr.ida > 0) {
        pr.ida -= pr.v * dt;
        if (pr.ida <= 0) { pr.hit = []; p.ev.push({ tipo: "volta", projetil: pr.id }); }
      } else if (dono && emCampo(dono)) {
        const d = norm(dono.x - pr.x, dono.y - pr.y, { x: -pr.dx, y: -pr.dy });
        pr.dx = d.x; pr.dy = d.y; pr.v = Math.max(pr.v, 9.5);
        if (d.l < 0.5) return false;
      }
    }
    pr.x += pr.dx * pr.v * dt; pr.y += pr.dy * pr.v * dt; pr.vida -= dt;
    if (pr.vida <= 0) return false;
    if (projetilBateParede(pr)) {
      if (pr.forma !== "bumerangue" || pr.ida <= 0) return false;
      pr.ida = 0; pr.hit = []; // o bumerangue bate e volta
    }
    const dono = p.entidades.find((e) => e.id === pr.dono);
    if (!dono) return false;
    for (const o of p.entidades) if (o.lado !== pr.lado && alcancavel(o) && Math.hypot(o.x - pr.x, o.y - pr.y) < o.raio + pr.raio) {
      if (pr.hit && pr.hit.includes(o.id)) continue;
      const dir = { x: pr.dx, y: pr.dy };
      if (pr.hab.classe === "debuff") {
        if (pegaNaGuarda(o, dir)) { p.ev.push({ tipo: "dano", de: dono.id, em: o.id, dano: 0, hp: o.bicho.hp, eff: 1, bloqueado: true }); return false; }
        aplicarMod(p, o, pr.hab.mv.foe || {});
        if (pr.hab.mv.atordoa) { o.atordoadoEm = -9; atordoar(p, o, pr.hab.mv.atordoa, "sono"); }
        return false;
      }
      const r = aplicarDano(p, dono, o, pr.hab, { dir, projetil: pr, fator: pr.fator ?? (pr.forma === "bumerangue" ? 0.65 : 1) });
      if (r === "aparou") return true; // voltou para o outro lado
      if (pr.forma === "bumerangue") { pr.hit.push(o.id); continue; }
      return false;
    }
    return true;
  }

  // cada área anda do seu jeito; devolve false quando acaba
  function atualizarArea(p, a, dt) {
    a.t -= dt;
    const dono = p.entidades.find((e) => e.id === a.dono);
    const inimigos = dono ? p.entidades.filter((o) => o.lado !== a.lado && alcancavel(o)) : [];
    if (a.forma === "anel") {
      const r = a.r * (1 - Math.max(0, a.t) / a.aviso);
      for (const o of inimigos) if (!a.hit.includes(o.id) && Math.abs(Math.hypot(o.x - a.x, o.y - a.y) - r) < 0.45 + o.raio) {
        a.hit.push(o.id); aplicarDano(p, dono, o, a.hab, { de: a });
      }
      return a.t > 0;
    }
    if (a.forma === "onda") {
      a.x += a.dx * a.v * dt; a.y += a.dy * a.v * dt;
      for (const o of inimigos) if (!a.hit.includes(o.id)) {
        const rx = o.x - a.x, ry = o.y - a.y, ao = rx * a.dx + ry * a.dy, lat = Math.abs(rx * a.dy - ry * a.dx);
        if (Math.abs(ao) < 0.45 + o.raio && lat < a.r + o.raio) { a.hit.push(o.id); aplicarDano(p, dono, o, a.hab, { dir: { x: a.dx, y: a.dy } }); }
      }
      return a.t > 0;
    }
    if (a.forma === "zona") {
      for (const o of inimigos) {
        const d = norm(a.x - o.x, a.y - o.y, { x: 0, y: 0 });
        if (a.hab.puxa && d.l < a.r * 1.7 && d.l > 0.2) empurrar(o, d, 16 * dt); // o redemoinho puxa para o meio
      }
      a.tique -= dt;
      if (a.tique <= 0) {
        a.tique = 0.5;
        for (const o of inimigos) if (Math.hypot(o.x - a.x, o.y - a.y) <= a.r + o.raio) aplicarDano(p, dono, o, a.hab, { de: a, fator: 0.24, empurra: 0 });
      }
      return a.t > 0;
    }
    if (a.forma === "armadilha") {
      if (a.arma > 0) { a.arma -= dt; return a.t > 0; }
      for (const o of inimigos) if (Math.hypot(o.x - a.x, o.y - a.y) <= a.r + o.raio && !(spec(p, o.bicho).types || []).includes("Voador")) {
        a.estourou = true;
        aplicarDano(p, dono, o, a.hab, { dir: { x: 0, y: 0 }, de: a });
        atordoar(p, o, 0.35, "armadilha");
        return false;
      }
      return a.t > 0;
    }
    if (a.forma === "feixe" || a.forma === "cone") return a.t > 0; // só para ver: o dano já saiu
    // queda e bomba: cai tudo de uma vez quando o aviso acaba
    if (a.t > 0) return true;
    a.estourou = true;
    for (const o of inimigos) if (Math.hypot(o.x - a.x, o.y - a.y) <= a.r + o.raio) aplicarDano(p, dono, o, a.hab, { de: a });
    return false;
  }

  // ---------- robô ----------
  // o robô lê o jogo: foge do aviso no chão, esquiva ou apara o que vem, pune quem está preparando ou tonto,
  // agarra quem fica na guarda e mira à frente de quem anda
  function pensarRobo(p, e) {
    if (!emCampo(e)) return {};
    const alvo = alvoMaisPerto(p, e);
    if (!alvo) return {};
    const ia = e.ia || (e.ia = { guarda: 0, lado: p.rng() < 0.5 ? 1 : -1, trocaLado: 0, pausa: 0, ameaca: null, reageEm: 0, decidiu: true });
    const perf = PERFIL_ROBO[clamp(Math.round(p.nivel ?? 1), 0, 2)], entre = ([a, b]) => a + p.rng() * (b - a);
    // o tempo que passou desde a última vez (o servidor chama a cada passo; quem usa o robô fora dele, a cada pacote)
    const dt = clamp(p.t - (ia.t ?? p.t - 1 / 60), 0, 0.25); ia.t = p.t;
    const dx = alvo.x - e.x, dy = alvo.y - e.y, d = Math.hypot(dx, dy) || 1;
    let ideal = 3.2, golpe = null, valor = -Infinity;
    const moves = spec(p, e.bicho).moves || [];
    const vulneravel = alvo.preparo || alvo.atordoado > 0.15 || alvo.salto || (alvo.sequencia && alvo.sequencia.tipo === "rajada");
    for (let i = 0; i < moves.length; i++) {
      const mv = p.dex.MOVES[moves[i]];
      if (e.bicho.cds[i] > 0 || (p.modo === "naruto" && e.bicho.chakra < (mv.custo || 0)) || (mv.max && (e.bicho.usos[moves[i]] || 0) >= mv.max)) continue;
      const hab = habilidadeDeGolpe(moves[i], mv);
      const perto = PERTO.includes(hab.classe);
      const alcance = perto ? 1.05 + BOTE_MAX * 0.7 : ["investida", "cone"].includes(hab.classe) ? 2.3 : hab.classe === "anel" ? hab.raio * 0.6 : hab.classe === "feixe" ? 5 : 4.2;
      const eff = p.dex.effect(hab.tipo, spec(p, alvo.bicho).types || ["Normal"]);
      let v = (hab.poder || 30) * Math.max(0.25, eff) / hab.recarga - Math.abs(d - alcance) * 4;
      if (hab.poder <= 0) v = hab.classe === "cura" ? (e.bicho.hp < e.bicho.max * 0.45 ? 40 : -50) : 6;
      if (hab.classe === "arremesso" && alvo.guardando) v += 40; // agarrão contra guarda
      if (vulneravel && hab.poder > 0) v += 15;
      if (hab.preparo && d < 2) v -= 20; // preparar colado no outro é pedir para apanhar
      if (v > valor) { valor = v; golpe = i; ideal = alcance; }
    }
    // andar: no alcance do golpe escolhido, rodando de lado para não ficar parado na mira
    if ((ia.trocaLado -= dt) <= 0) { ia.trocaLado = 1 + p.rng() * 2; if (p.rng() < 0.4) ia.lado = -ia.lado; }
    let mx = -dy / d * ia.lado * 0.6, my = dx / d * ia.lado * 0.6;
    if (d > ideal + 0.35) { mx += dx / d; my += dy / d; }
    else if (d < ideal - 0.35) { mx -= dx / d; my -= dy / d; }
    // o terreno: sai do que atrapalha (a lava, a água para quem não nada) e fica no que é de casa
    if (p.terreno && p.terreno.length) {
      const t = noTerreno(p, e);
      if (t.zona && !t.casa && t.vel < 1) { const fx = e.x - t.zona.x, fy = e.y - t.zona.y, l = Math.hypot(fx, fy) || 1; mx += fx / l * (t.zona.tipo === "lava" ? 1.6 : 0.8); my += fy / l * (t.zona.tipo === "lava" ? 1.6 : 0.8); }
    }
    // o aviso no chão de quem é do outro lado: sai de dentro
    for (const a of p.areas) if (a.lado !== e.lado && ["queda", "bomba", "zona", "armadilha"].includes(a.forma)) {
      const ex = e.x - a.x, ey = e.y - a.y, l = Math.hypot(ex, ey);
      if (l < a.r + 0.7 && (a.forma !== "armadilha" || a.arma <= 0)) { mx = ex / (l || 1) * 1.5; my = ey / (l || 1) * 1.5; }
    }
    // o salto do outro vai cair aqui: sai
    if (alvo.salto && Math.hypot(alvo.salto.para.x - e.x, alvo.salto.para.y - e.y) < alvo.salto.hab.raio + 0.6) { const ex = e.x - alvo.salto.para.x, ey = e.y - alvo.salto.para.y, l = Math.hypot(ex, ey) || 1; mx = ex / l * 1.5; my = ey / l * 1.5; }
    // feixe sendo preparado mirando em mim: sai da linha
    if (alvo.preparo && alvo.preparo.hab.classe === "feixe") {
      const m = alvo.preparo.mira, lat = (e.x - alvo.x) * m.y - (e.y - alvo.y) * m.x;
      if (Math.abs(lat) < 1.2) { const s = lat >= 0 ? 1 : -1; mx = m.y * s * 1.5; my = -m.x * s * 1.5; }
    }
    ({ x: mx, y: my } = longeDaParede(e, mx, my, dx / d, dy / d, ia));
    const lead = (hab) => { // mira à frente de quem anda
      const v = hab && hab.velocidade ? hab.velocidade : 8, t = Math.min(0.6, d / v) * perf.lead;
      const mx = alvo.x + (alvo.vx || 0) * t - e.x, my = alvo.y + (alvo.vy || 0) * t - e.y, erro = (p.rng() * 2 - 1) * perf.erro;
      return { x: mx * Math.cos(erro) - my * Math.sin(erro), y: mx * Math.sin(erro) + my * Math.cos(erro) }; // e erra um pouco
    };
    const cmd = { dx: mx, dy: my, mira: { x: dx, y: dy } };
    // o que vem na minha direção
    const vindo = p.projeteis.find((pr) => pr.lado !== e.lado && vindoNaDirecao(pr, e));
    const pertoDeBater = p.entidades.some((o) => o.lado !== e.lado && emCampo(o) && ((o.dash && dist(o, e) < 2.4) || (o.sequencia && o.sequencia.tipo === "combo" && dist(o, e) < 1.8)));
    const anel = p.areas.some((a) => a.lado !== e.lado && a.forma === "anel" && Math.abs(Math.hypot(e.x - a.x, e.y - a.y) - a.r * (1 - a.t / a.aviso)) < 0.9);
    // o perigo: o robô vê na hora, mas só reage depois do tempo de reação (uma decisão por perigo)
    const ameaca = vindo ? `p${vindo.id}` : pertoDeBater ? "perto" : anel ? "anel" : null;
    if (ameaca !== ia.ameaca) { ia.ameaca = ameaca; ia.reageEm = p.t + entre(perf.reacao); ia.decidiu = !ameaca; }
    if (ameaca && !ia.decidiu && p.t >= ia.reageEm && !e.atordoado) {
      ia.decidiu = true;
      const sorte = p.rng();
      if (vindo && sorte < perf.guarda && e.guarda > 40) { ia.guarda = 0.35; cmd.mira = { x: -vindo.dx, y: -vindo.dy }; }
      else if (sorte < perf.guarda + perf.foge && e.esquivaCd <= 0 && (p.modo !== "naruto" || (e.jogador.substitutes > 0 && e.bicho.chakra >= 20))) {
        cmd.esquiva = true;
        const ref = vindo ? { x: vindo.dx, y: vindo.dy } : { x: dx / d, y: dy / d };
        cmd.dx = -ref.y * ia.lado; cmd.dy = ref.x * ia.lado;
      } else if (pertoDeBater && e.guarda > 30 && sorte < perf.guarda + perf.foge + 0.2) ia.guarda = 0.4;
    }
    if (ia.guarda > 0) { ia.guarda -= dt; cmd.guarda = true; if (!vindo) cmd.mira = { x: dx, y: dy }; return cmd; }
    // atacar: depois de cada golpe o robô respira um pouco (perf.pausa); quem ficou vulnerável ele pune (perf.pune)
    ia.pausa -= dt;
    const pode = ia.pausa <= 0 || (vulneravel && p.rng() < perf.pune * 0.05);
    if (golpe != null && !ocupado(e) && pode && (d < 5.5 || valor > 4) && p.rng() < 0.3) {
      cmd.golpe = golpe; ia.pausa = entre(perf.pausa);
      const hab = habilidadeDeGolpe(moves[golpe], p.dex.MOVES[moves[golpe]]);
      const m = lead(hab);
      cmd.mira = m;
      if (["area", "sumir", "bomba", "salto", "zona", "armadilha"].includes(hab.classe)) cmd.alvo = { x: e.x + m.x, y: e.y + m.y };
    }
    if (e.bicho.hp < e.bicho.max * 0.18 && e.jogador.trocaCd <= 0) {
      const idx = e.jogador.time.findIndex((m, i) => i !== e.jogador.ativo && m.hp > m.max * 0.4);
      if (idx >= 0) cmd.troca = idx;
    }
    return cmd;
  }

  // a parede: recuar contra ela deixava o robô parado na borda, apanhando sem reagir. Perto da borda ele não empurra
  // mais para fora, volta aos poucos para o meio e, se não sobra para onde andar, desliza ao longo dela (para o lado
  // que não é o canto)
  const MARGEM_ROBO = 1.3;
  function longeDaParede(e, mx, my, ax, ay, ia) {
    const hx = ARENA.w / 2 - e.raio, hy = ARENA.h / 2 - e.raio;
    const perto = (v, h) => (v > h - MARGEM_ROBO ? -1 : v < -h + MARGEM_ROBO ? 1 : 0); // para onde fica o meio
    const px = perto(e.x, hx), py = perto(e.y, hy);
    if (!px && !py) return { x: mx, y: my };
    const forca = (v, h) => clamp(1 - (h - Math.abs(v)) / MARGEM_ROBO, 0, 1);
    if (px && mx * px < 0) mx = 0;
    if (py && my * py < 0) my = 0;
    mx += px * forca(e.x, hx) * 0.9; my += py * forca(e.y, hy) * 0.9;
    if (Math.hypot(mx, my) < 0.5) {
      // de lado em relação ao outro, escolhendo o sentido que leva para o meio
      let tx = -ay * ia.lado, ty = ax * ia.lado;
      if (tx * (px || -Math.sign(e.x)) + ty * (py || -Math.sign(e.y)) < 0) { ia.lado = -ia.lado; tx = -tx; ty = -ty; }
      mx += tx; my += ty;
    }
    return { x: mx, y: my };
  }

  function vindoNaDirecao(pr, e) {
    const ex = e.x - pr.x, ey = e.y - pr.y;
    const frente = ex * pr.dx + ey * pr.dy;
    if (frente < 0 || frente > pr.v * 0.55) return false;
    const lateral = Math.abs(ex * pr.dy - ey * pr.dx);
    return lateral < e.raio + pr.raio + 0.35;
  }

  function ladoVivo(p, lado) {
    return p.lados[lado].jogadores.some((j) => j.time.some((m) => m.hp > 0));
  }

  function vidaPercentual(p, lado) {
    let soma = 0;
    for (const j of p.lados[lado].jogadores) for (const m of j.time) soma += m.hp / m.max;
    return soma;
  }

  function terminar(p, vencedor, empate = false) {
    p.fim = true; p.vencedor = vencedor; p.empate = empate;
    p.ev.push({ tipo: "fim", vencedor, empate });
  }

  function checarFim(p) {
    const vivos = [ladoVivo(p, 0), ladoVivo(p, 1)];
    if (!vivos[0] || !vivos[1]) return terminar(p, vivos[0] ? 0 : vivos[1] ? 1 : -1, !vivos[0] && !vivos[1]);
    if (p.t >= p.duracao) {
      const a = vidaPercentual(p, 0), b = vidaPercentual(p, 1);
      return terminar(p, a > b ? 0 : b > a ? 1 : -1, a === b);
    }
  }

  // os relógios de cada um (o servidor e a previsão da tela usam os mesmos)
  function relogios(e, dt) {
    e.invulneravel = Math.max(0, e.invulneravel - dt);
    e.esquivaCd = Math.max(0, e.esquivaCd - dt);
    e.impedido = Math.max(0, (e.impedido || 0) - dt);
    e.atordoado = Math.max(0, (e.atordoado || 0) - dt);
    // a guarda gasta enquanto segura e volta quando solta
    if (e.guardando) e.guarda = Math.max(0, e.guarda - 14 * dt);
    else if ((e.guardaSolta = Math.max(0, (e.guardaSolta || 0) - dt)) <= 0) e.guarda = Math.min(GUARDA_MAX, e.guarda + 24 * dt);
  }

  function passo(p, dt, comandos = {}) {
    if (p.fim) return p.ev;
    dt = clamp(Number(dt) || 0, 0, 0.1);
    p.ev = [];
    p.t += dt;
    for (const e of p.entidades) {
      const b = e.bicho;
      for (let i = 0; i < b.cds.length; i++) b.cds[i] = Math.max(0, b.cds[i] - dt);
      if (p.modo === "naruto" && e.campo && b.hp > 0) b.chakra = Math.min(p.dex.CHAKRA_MAX, b.chakra + dt * 8);
      atualizarMods(b, dt);
      relogios(e, dt);
      if (e.escudo) { e.escudo.t -= dt; if (e.escudo.t <= 0) e.escudo = null; }
      e.jogador.trocaCd = Math.max(0, e.jogador.trocaCd - dt);
      if (e.canal) {
        e.canal.t -= dt;
        if (e.canal.t <= 0) { curar(p, e, e.bicho.max * e.canal.heal); e.canal = null; }
      }
      atualizarEntrada(p, e, dt);
      queimarNaLava(p, e, dt);
    }
    for (const e of p.entidades) {
      const c = e.jogador.bot ? pensarRobo(p, e) : comandoDe(comandos, e);
      if (!e.preparo) { const mira = dirMira(e, c); e.mira = { x: mira.x, y: mira.y }; }
      // o golpe apertado enquanto o bicho está ocupado (pulando, no combo, tonto) fica guardado um instante e sai
      // assim que ele fica livre: o comando não se perde
      if (c.golpe != null && e.campo) e.buffer = { idx: clamp(Number(c.golpe), 0, 3), c: { ...c, golpe: undefined }, ate: p.t + BUFFER };
      if (!(e.atordoado > 0)) {
        if (c.troca != null) trocar(p, e, Number(c.troca), false);
        if (c.esquiva) { esquivar(p, e, c); e.buffer = null; }
      }
      if (e.buffer) {
        if (p.t > e.buffer.ate || !emCampo(e)) e.buffer = null;
        else if (!(e.atordoado > 0) && !ocupado(e) && e.bicho.cds[e.buffer.idx] <= 0) { const bf = e.buffer; e.buffer = null; usarGolpe(p, e, bf.idx, c.golpe != null ? c : { ...bf.c, mira: c.mira || bf.c.mira, alvo: c.alvo || bf.c.alvo }); }
      }
      guardar(p, e, !!c.guarda && c.golpe == null && !c.esquiva);
      if (e.preparo && emCampo(e)) {
        e.preparo.t -= dt;
        if (e.preparo.t <= 0) { const pr = e.preparo; e.preparo = null; e.mira = { ...pr.mira }; executarGolpe(p, e, pr.hab, pr.mira, pr.ponto, c); }
      }
      if (emCampo(e)) atualizarSequencia(p, e, dt, c);
      mover(e, dt, c, p);
    }
    p.projeteis = p.projeteis.filter((pr) => atualizarProjetil(p, pr, dt));
    p.areas = p.areas.filter((a) => atualizarArea(p, a, dt));
    checarFim(p);
    return p.ev;
  }

  function estado(p) {
    return {
      modo: p.modo, t: p.t, fim: p.fim, vencedor: p.vencedor, empate: p.empate,
      entidades: p.entidades.map((e) => ({ id: e.id, lado: e.lado, x: e.x, y: e.y, campo: e.campo, bicho: e.bicho.id, hp: e.bicho.hp, max: e.bicho.max, ativo: e.jogador.ativo, guarda: e.guarda, atordoado: e.atordoado, ...(p.modo === "naruto" && { chakra: e.bicho.chakra, substitutes: e.jogador.substitutes }) })),
      projeteis: p.projeteis.map((pr) => ({ id: pr.id, x: pr.x, y: pr.y, tipo: pr.hab.tipo, forma: pr.forma })),
      areas: p.areas.map((a) => ({ id: a.id, x: a.x, y: a.y, r: a.r, t: a.t, tipo: a.hab.tipo, forma: a.forma })),
    };
  }

  // A tela prevê só o movimento (com o empurrão, a guarda, o salto e o tonto). Vida, acertos, golpes e trocas
  // continuam no servidor.
  function preverMovimento(p, e, dt, c = {}) {
    dt = clamp(Number(dt) || 0, 0, 0.1);
    p.t = (p.t || 0) + dt;
    if (e.kx == null) { e.kx = 0; e.ky = 0; }
    if (e.guarda == null) e.guarda = GUARDA_MAX;
    relogios(e, dt);
    if (e.canal) { e.canal.t -= dt; if (e.canal.t <= 0) e.canal = null; }
    if (e.preparo) { e.preparo.t -= dt; if (e.preparo.t <= 0) e.preparo = null; }
    if (e.oculto || e.salto) { mover(e, dt, c, p, true); return e; }
    if (!e.preparo) { const mira = dirMira(e, c); e.mira = { x: mira.x, y: mira.y }; }
    if (c.esquiva && !(e.atordoado > 0)) esquivar(p, e, c);
    guardar(p, e, !!c.guarda && !c.esquiva);
    mover(e, dt, c, p, true);
    return e;
  }

  const api = { DIFICULDADES, PERFIL_ROBO, VEL_MIN, VEL_MAX, RE, BOTE_MAX, BOTE_VEL, velocidade, fatorDaRe, ARENA, BIOMAS, BIOMA_DO_TIPO, TERRENOS, TERRENO, escolherBioma, VEL_CASA, DANO_CASA, QUEIMA, terrenoDe, zonaEm, noTerreno, TEMPO_MAX, K_DANO, K_DANO_POKEMON, GUARDA_MAX, ESQUIVA_CD, JANELA_APARAR, JANELA_PERFEITA, ESTILOS, sorteDe, criarPartida, passo, preverMovimento, pensarRobo, habilidadeDeGolpe, habilidadesDoDex, calcularDano, estado };
  return api;
});
